import OfflineService from '../services/offline/OfflineService';
import ApiClient from '../services/ApiClient';
import { SyncAction, AssignmentResponse, ServerUpdatePayload } from '../services/offline/OfflineService'; // Assuming these types are exported

/**
 * The SyncEngine orchestrates all synchronization processes between the PWA and the backend.
 * It handles background uploads, delta downloads, and full downloads.
 * Implemented as a singleton.
 */
class SyncEngine {
  private static instance: SyncEngine;
  private offlineService: OfflineService;
  private apiClient: ApiClient;
  private syncInterval: number | undefined; // For background sync

  private constructor() {
    this.offlineService = OfflineService; // Already a singleton instance
    this.apiClient = ApiClient; // Already a singleton instance
  }

  /**
   * Returns the singleton instance of the SyncEngine.
   * @returns {SyncEngine} The singleton instance.
   */
  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  /**
   * Starts the background synchronization process (e.g., for uploading pending actions).
   */
  public startBackgroundSync(): void {
    // Implement background sync logic here, e.g., using setInterval
    // For now, just a placeholder
    console.log('SyncEngine: Starting background sync...');
    this.syncInterval = setInterval(() => {
      this.performUploadSync();
    }, 30000); // Every 30 seconds, for example
  }

  /**
   * Stops the background synchronization process.
   */
  public stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
      console.log('SyncEngine: Stopped background sync.');
    }
  }

  /**
   * Performs the upload synchronization: sends pending actions from sync_queue to the server.
   * Corresponds to 6.1. Upload Perubahan Lokal in spec/alur-kerja.md
   */
  public async performUploadSync(): Promise<void> {
    console.log('SyncEngine: Performing upload sync...');
    let action: SyncAction | undefined;
    while ((action = await this.offlineService.getNextQueueItem())) {
      try {
        await this.offlineService.updateQueueItemStatus(action.id!, 'processing');
        if (action.type === 'submitAssignment') {
          // Assuming action.metadata contains the assignment data to be submitted
          await this.apiClient.post('/api/assignments/submit', action.metadata);
        } else if (action.type === 'updateAssignmentStatus') {
          // Assuming action.metadata contains { assignmentId, newStatus, notes? }
          await this.apiClient.post('/api/assignments/update-status', action.metadata);
        }
        // Add more action types as needed
        else {
          console.warn(`SyncEngine: Unknown sync action type: ${action.type}. Skipping API call. (Activity ID: ${action.metadata.activityId})`);
        }
        console.log(`SyncEngine: Processing sync action type: ${action.type}`);
        await this.offlineService.updateQueueItemStatus(action.id!, 'completed');
      } catch (error: unknown) { // Changed to unknown
        if ((error as any).response && (error as any).response.status === 409) { // Cast to any for response access
          console.warn('SyncEngine: Optimistic locking conflict detected for action:', action);
          // Conflict: Server data is newer. Re-download latest data for this assignment/activity
          // and then re-queue the action for a retry.
          // For simplicity, we'll just re-queue and log for now.
          // In a real app, you might trigger a delta sync for the specific assignment
          // or notify the user to manually resolve.
          await this.offlineService.updateQueueItemStatus(action.id!, 'pending', 'Conflict detected, re-queued');
          await this.offlineService.storeErrorLog({
            timestamp: Date.now(),
            error: `Optimistic locking conflict for action ${action.type}: ${(error as Error).message}`,
            stack: (error as Error).stack,
          });
        } else {
          console.error('SyncEngine: Upload sync failed for action:', action, error);
          await this.offlineService.updateQueueItemStatus(action.id!, 'failed', (error as Error).message);
          await this.offlineService.storeErrorLog({
            timestamp: Date.now(),
            error: `Upload sync failed for action ${action.type}: ${(error as Error).message}`,
            stack: (error as Error).stack,
          });
        }
        // Stop processing further actions if one fails, or implement retry logic
        break;
      }
    }
    console.log('SyncEngine: Upload sync completed.');
  }

  /**
   * Performs a delta download synchronization for a specific activity.
   * Fetches changes from the server and applies them locally.
   * Corresponds to 6.2. Sync Perubahan Assignment in spec/alur-kerja.md
   * @param {string} activityId - The ID of the activity to sync.
   */
  public async performDeltaDownloadSync(activityId: string): Promise<void> {
    console.log(`SyncEngine: Performing delta download sync for activity: ${activityId}...`);
    try {
      const lastSyncTimestamp = await this.offlineService.getLastSyncTimestamp(activityId);
      const queryParams = lastSyncTimestamp ? `?lastSync=${lastSyncTimestamp}` : '';
      // Expected Request: GET /api/activities/{activityId}/delta-updates?lastSync={timestamp}
      // Expected Response (ServerUpdatePayload):
      // {
      //   assignmentsToUpdate: AssignmentResponse[]; // Assignments that have changed or are new
      //   masterDataToUpdate: { key: string; value: any }[]; // Master data updates
      // }
      const updates: ServerUpdatePayload = await this.apiClient.get(`/api/activities/${activityId}/delta-updates${queryParams}`);
      await this.offlineService.applyServerUpdates(activityId, updates);
      await this.offlineService.setLastSyncTimestamp(activityId, Date.now()); // Update timestamp after successful sync
      console.log(`SyncEngine: Delta download sync completed for activity: ${activityId}.`);
    } catch (error: unknown) { // Changed to unknown
      if ((error as any).response && (error as any).response.status === 409) { // Cast to any for response access
        console.warn(`SyncEngine: Conflict during delta download for activity ${activityId}. Suggesting full re-sync.`, error);
        await this.offlineService.storeErrorLog({
          timestamp: Date.now(),
          error: `Conflict during delta download for activity ${activityId}: ${(error as Error).message}`,
          stack: (error as Error).stack,
        });
        // Optionally, trigger a full re-sync or notify the user
        // await this.performFullDownloadSync(activityId);
      } else {
        console.error(`SyncEngine: Delta download sync failed for activity ${activityId}:`, error);
        await this.offlineService.storeErrorLog({
          timestamp: Date.now(),
          error: `Delta download sync failed for activity ${activityId}: ${(error as Error).message}`,
          stack: (error as Error).stack,
        });
      }
    }
  }

  /**
   * Performs a full download synchronization for a specific activity.
   * Clears local data for the activity and re-downloads everything.
   * Corresponds to 6.3. Sync Full Assignment in spec/alur-kerja.md
   * @param {string} activityId - The ID of the activity to sync.
   */
  public async performFullDownloadSync(activityId: string): Promise<void> {
    console.log(`SyncEngine: Performing full download sync for activity: ${activityId}...`);
    try {
      await this.offlineService.clearActivityData(activityId);

      const allData: ServerUpdatePayload = await this.apiClient.get(`/api/activities/${activityId}/initial-data`);
      await this.offlineService.applyServerUpdates(activityId, allData);
      await this.offlineService.setLastSyncTimestamp(activityId, Date.now()); // Update timestamp after successful sync
      console.log(`SyncEngine: Full download sync completed for activity: ${activityId}.`);
    } catch (error: unknown) { // Changed to unknown
      if ((error as any).response && (error as any).response.status === 409) { // Cast to any for response access
        console.warn(`SyncEngine: Conflict during full download for activity ${activityId}.`, error);
        await this.offlineService.storeErrorLog({
          timestamp: Date.now(),
          error: `Conflict during full download for activity ${activityId}: ${(error as Error).message}`,
          stack: (error as Error).stack,
        });
      } else {
        console.error(`SyncEngine: Full download sync failed for activity ${activityId}:`, error);
        await this.offlineService.storeErrorLog({
          timestamp: Date.now(),
          error: `Full download sync failed for activity ${activityId}: ${(error as Error).message}`,
          stack: (error as Error).stack,
        });
      }
    }
  }
}

export default SyncEngine.getInstance();
