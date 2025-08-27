import Dexie, { Table } from 'dexie';

// --- Placeholder Types ---
// In a real application, these would be defined in a centralized types file.
export interface AssignmentResponse {
  interviewId: string;
  formId: string;
  status: string;
  syncStatus: {
    version: number;
  };
  activityId: string; // Added activityId
  // other assignment properties
}

export interface SyncAction {
  id?: number;
  type: string; // e.g., 'submitAssignment', 'uploadPhoto'
  metadata: {
    activityId: string;
    priority: number;
    // other relevant data
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ServerUpdatePayload {
  assignmentsToUpdate: AssignmentResponse[];
  masterDataToUpdate: { key: string; value: any }[];
}

export interface ErrorLog {
  id?: number;
  timestamp: number;
  error: string;
  stack?: string;
}

/**
 * Defines the structure of the CapiDB database using Dexie.
 */
class CapiDB extends Dexie {
  public assignments!: Table<AssignmentResponse, [string, string]>;
  public sync_queue!: Table<SyncAction, number>;
  public master_data!: Table<{ key: string; value: any }, string>;
  public error_logs!: Table<ErrorLog, number>;
  public sync_metadata!: Table<{ key: string; value: number }, string>; // New table for sync metadata

  constructor() {
    super('CapiDB');
    this.version(2).stores({
      // Version incremented to 2
      assignments:
        '&[activityId+interviewId], [activityId+status], [activityId+syncStatus.version], [activityId+formId], activityId', // Reverted primary key, added activityId as secondary index
      sync_queue: '++id, status, metadata.priority, metadata.activityId',
      master_data: '&key, activityId', // Added activityId to index
      error_logs: '++id, timestamp',
      sync_metadata: '&key', // Index for the new table
    });
    // Add migration for version 2 if needed for existing data transformation
    // this.version(2).upgrade(async (tx) => {
    //   // Example: If master_data previously didn't have activityId, and you need to populate it
    //   // await tx.master_data.toCollection().modify(item => {
    //   //   if (!item.activityId) item.activityId = 'defaultActivityId'; // Or derive from other data
    //   // });
    // });
  }
}

/**
 * The core service for all IndexedDB operations, designed with multi-survey support.
 * Implemented as a singleton to ensure a single database connection.
 */
class OfflineService {
  private static instance: OfflineService;
  private db: CapiDB;

  private constructor() {
    this.db = new CapiDB();
  }

  /**
   * Returns the singleton instance of the OfflineService.
   * @returns {OfflineService} The singleton instance.
   */
  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  /**
   * Performs an "upsert" for a given assignment into the database.
   * @param {string} activityId - The ID of the activity this assignment belongs to.
   * @param {AssignmentResponse} assignmentData - The full assignment data object.
   * @returns {Promise<void>}
   */
  public async storeAssignment(assignmentData: AssignmentResponse): Promise<void> {
    await this.db.assignments.put({ ...assignmentData });
  }

  /**
   * Retrieves a single assignment by its composite key.
   * @param {string} activityId - The ID of the activity.
   * @param {string} interviewId - The ID of the interview.
   * @returns {Promise<AssignmentResponse | undefined>} The assignment data or undefined if not found.
   */
  public async getAssignmentById(
    activityId: string,
    interviewId: string
  ): Promise<AssignmentResponse | undefined> {
    return this.db.assignments.get([activityId, interviewId]);
  }

  /**
   * Retrieves all assignments for a specific activity.
   * @param {string} activityId - The ID of the activity.
   * @returns {Promise<AssignmentResponse[]>} An array of assignment data.
   */
  public async getAllAssignments(activityId: string): Promise<AssignmentResponse[]> {
    return this.db.assignments.where({ activityId }).toArray();
  }

  /**
   * Adds a new action to the synchronization queue.
   * The action's metadata must contain an activityId.
   * @param {SyncAction} action - The synchronization action to queue.
   * @returns {Promise<void>}
   */
  public async queueForSync(action: SyncAction): Promise<void> {
    await this.db.sync_queue.add(action);
  }

  /**
   * Retrieves the oldest pending item from the sync queue.
   * @returns {Promise<SyncAction | undefined>} The next queue item or undefined if the queue is empty.
   */
  public async getNextQueueItem(): Promise<SyncAction | undefined> {
    return this.db.sync_queue.where({ status: 'pending' }).first();
  }

  /**
   * Updates the status of an item in the sync queue.
   * @param {number} id - The ID of the queue item to update.
   * @param {'processing' | 'completed' | 'failed'} status - The new status.
   * @param {string} [error] - An optional error message if the status is 'failed'.
   * @returns {Promise<void>}
   */
  public async updateQueueItemStatus(
    id: number,
    status: 'processing' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    await this.db.sync_queue.update(id, { status, error });
  }

  /**
   * Applies a batch of updates from the server to the local database for a specific activity.
   * This is performed in a single transaction to ensure data integrity.
   * @param {string} activityId - The ID of the activity to apply updates for.
   * @param {ServerUpdatePayload} updates - The payload from the server containing updates.
   * @returns {Promise<void>}
   */
  public async applyServerUpdates(activityId: string, updates: ServerUpdatePayload): Promise<void> {
    await this.db.transaction('rw', this.db.assignments, this.db.master_data, async () => {
      const assignmentPuts = updates.assignmentsToUpdate.map((assignment) =>
        this.db.assignments.put({ ...assignment, activityId })
      );
      const masterDataPuts = updates.masterDataToUpdate.map((data) =>
        this.db.master_data.put(data)
      );
      await Promise.all([...assignmentPuts, ...masterDataPuts]);
    });
  }

  /**
   * Adds a new error log to the global error_logs table.
   * @param {ErrorLog} log - The error log object to store.
   * @returns {Promise<void>}
   */
  public async storeErrorLog(log: ErrorLog): Promise<void> {
    await this.db.error_logs.add(log);
  }

  /**
   * Clears all local data (assignments and master data) for a specific activity.
   * This is used for the "Sync Full Assignment" strategy.
   * @param {string} activityId - The ID of the activity to clear data for.
   * @returns {Promise<void>}
   */
  public async clearActivityData(activityId: string): Promise<void> {
    await this.db.transaction('rw', this.db.assignments, this.db.master_data, async () => {
      await this.db.assignments.where({ activityId }).delete();
      // IMPORTANT: If master_data contains activity-specific data that should be cleared during a full sync,
      // the CapiDB schema (in the constructor) MUST be updated to include 'activityId' as an index for 'master_data'.
      // Example: master_data: '&key, activityId',
      // After schema update, uncomment the line below to clear master_data per activityId:
      await this.db.master_data.where({ activityId }).delete();
    });
  }

  /**
   * Sets the last synchronization timestamp for a given activity.
   * @param {string} activityId - The ID of the activity.
   * @param {number} timestamp - The timestamp (e.g., Date.now()).
   * @returns {Promise<void>}
   */
  public async setLastSyncTimestamp(activityId: string, timestamp: number): Promise<void> {
    await this.db.sync_metadata.put({ key: `lastSync_${activityId}`, value: timestamp });
  }

  /**
   * Gets the last synchronization timestamp for a given activity.
   * @param {string} activityId - The ID of the activity.
   * @returns {Promise<number | undefined>} The timestamp or undefined if not found.
   */
  public async getLastSyncTimestamp(activityId: string): Promise<number | undefined> {
    const record = await this.db.sync_metadata.get(`lastSync_${activityId}`);
    return record?.value;
  }
}

export default OfflineService.getInstance();
