import { activityDB, SyncQueueItem } from '../offline/ActivityDB';
import apiClient from '../ApiClient';
import { f7 } from 'framework7-vue';
import { useAuthStore } from '@/js/stores/authStore';
import { useDashboardStore } from '@/js/stores/dashboardStore';

const SYNC_INTERVAL = 1000 * 60; // 1 minute
const MAX_RETRIES = 3;

class SyncEngine {
  private intervalId: any = null;
  private isProcessing = false;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.startSync.bind(this));
    window.addEventListener('offline', this.stopSync.bind(this));
  }

  public startSync() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (navigator.onLine) {
      console.log('SyncEngine: Starting sync process...');
      this.processQueue(); // Process immediately on start
      this.intervalId = setInterval(() => this.processQueue(), SYNC_INTERVAL);
    } else {
      console.log('SyncEngine: Offline, not starting sync.');
    }
  }

  public stopSync() {
    console.log('SyncEngine: Stopping sync process.');
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public async queueForSync(type: SyncQueueItem['type'], payload: any) {
    const authStore = useAuthStore();
    if (!authStore.user?.id) {
      console.error('SyncEngine: Cannot queue item, user is not authenticated.');
      return;
    }
    const item: SyncQueueItem = {
      user_id: authStore.user.id,
      type,
      payload,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retries: 0,
    };
    await activityDB.syncQueue.add(item);
    console.log('SyncEngine: Item queued for sync:', item);
    this.processQueue(); // Attempt to process immediately
  }

  private async processQueue() {
    if (this.isProcessing || !navigator.onLine) {
      console.log('SyncEngine: Already processing or offline. Skipping.');
      return;
    }

    this.isProcessing = true;
    console.log('SyncEngine: Processing sync queue...');

    const itemsToSync = await activityDB.syncQueue
      .where('status')
      .anyOf('pending', 'failed')
      .toArray();

    if (itemsToSync.length === 0) {
      console.log('SyncEngine: No items to sync.');
      this.isProcessing = false;
      return;
    }

    for (const item of itemsToSync) {
      try {
        await activityDB.syncQueue.update(item.id!, { status: 'processing' });
        const dashboardStore = useDashboardStore();

        let response;
        switch (item.type) {
          case 'submitAssignment':
            // --- VALIDASI RUNTIME ---
            if (!item.payload?.activityId || !item.payload?.assignmentResponse) {
              throw new Error('Payload untuk submitAssignment tidak lengkap.');
            }
            console.log('[CAPI-DEBUG] SyncEngine: Processing submitAssignment. Full payload:', JSON.stringify(item.payload, null, 2));
            const apiPayload = [item.payload.assignmentResponse];
            console.log('[CAPI-DEBUG] SyncEngine: Calling apiClient.submitAssignmentBatch with payload:', JSON.stringify(apiPayload, null, 2));

            response = await apiClient.submitAssignmentBatch(
              item.payload.activityId,
              apiPayload
            );

            // On success, update the local state
            const submittedResponse = item.payload.assignmentResponse;
            submittedResponse.status = 'Submitted by PPL';
            await activityDB.assignmentResponses.put(submittedResponse);

            const parentAssignment = await activityDB.assignments.get(submittedResponse.assignment_id);
            if (parentAssignment) {
                parentAssignment.status = 'Submitted by PPL';
                await activityDB.assignments.put(parentAssignment);
                dashboardStore.upsertAssignment({ ...parentAssignment, response: submittedResponse });
                console.log(`[CAPI-DEBUG] SyncEngine: Updated local assignment ${submittedResponse.assignment_id} to 'Submitted by PPL' status.`);
            }
            break;
          case 'approveAssignment':
            // Assuming payload contains { assignmentId, status, notes }
            response = await apiClient.updateAssignmentStatus(
              item.payload.assignmentId,
              item.payload.status,
              item.payload.notes
            );
            break;
          case 'rejectAssignment':
            // --- VALIDASI RUNTIME ---
            if (!item.payload?.assignmentId || !item.payload?.status) {
              throw new Error('Payload untuk approve/rejectAssignment tidak lengkap.');
            }
            // -------------------------

            response = await apiClient.updateAssignmentStatus(
              item.payload.assignmentId,
              item.payload.status,
              item.payload.notes // notes boleh opsional
            );
            break;
          case 'revertApproval':
            // Assuming payload contains { assignmentId, status, notes }
            response = await apiClient.updateAssignmentStatus(
              item.payload.assignmentId,
              item.payload.status,
              item.payload.notes
            );
            break;
          case 'createAssignment':
            // Assuming payload contains { assignment, assignmentResponse }
            response = await apiClient.createAssignment(
              item.payload.assignment,
              item.payload.assignmentResponse,
              null // No photo for this case
            );
            // After successful creation on server, update local status to Submitted by PPL
            const createdAssignment = { ...item.payload.assignment, status: 'Submitted by PPL' };
            const createdAssignmentResponse = { ...item.payload.assignmentResponse, status: 'Submitted by PPL' };
            await activityDB.assignments.put(createdAssignment);
            await activityDB.assignmentResponses.put(createdAssignmentResponse);
            dashboardStore.upsertAssignment({ ...createdAssignment, response: createdAssignmentResponse });
            console.log(`SyncEngine: Updated local assignment ${createdAssignment.id} to 'Submitted by PPL' status.`);
            break;

          case 'createAssignmentWithPhoto':
            { // Use block scope for new variables
              const { localPhotoId, assignment, assignmentResponse, activityId, imageQuestionId } = item.payload;
              if (!localPhotoId || !assignment || !assignmentResponse || !activityId || !imageQuestionId) {
                throw new Error('Payload for createAssignmentWithPhoto is incomplete.');
              }

              // 1. Get the blob from local DB
              const photoBlobRecord = await activityDB.photoBlobs.get(localPhotoId);
              if (!photoBlobRecord) {
                throw new Error(`Photo with localId ${localPhotoId} not found in local DB.`);
              }

              // 2. Upload the photo
              const uploadResponse = await apiClient.uploadAssignmentPhoto(
                activityId,
                assignment.id, // Use the new assignment's ID as the interviewId
                photoBlobRecord.blob as File
              );

              if (!uploadResponse || !uploadResponse.fileId) {
                throw new Error('Failed to upload photo or server did not return a fileId.');
              }
              
              const serverPhotoId = uploadResponse.fileId;

              // 3. Create the assignment with the real photo ID
              const createResponse = await apiClient.createAssignment(
                assignment,
                assignmentResponse,
                serverPhotoId
              );

              // 4. Update local data to final state
              const finalAssignment = { ...assignment, status: 'Submitted by PPL' };
              const finalResponse = { ...assignmentResponse, status: 'Submitted by PPL' };
              if (uploadResponse.filePath) {
                  finalResponse.responses[imageQuestionId] = uploadResponse.filePath;
              }

              await activityDB.assignments.put(finalAssignment);
              console.log(`[CAPI-DEBUG] SyncEngine: Successfully updated local assignment ${assignment.id} to status Submitted by PPL after sync.`);
              await activityDB.assignmentResponses.put(finalResponse);
              dashboardStore.upsertAssignment({ ...finalAssignment, response: finalResponse });
              
              // 5. Cleanup
              await activityDB.photoBlobs.delete(localPhotoId);
              
              console.log(`SyncEngine: Successfully processed createAssignmentWithPhoto for assignment ${assignment.id}.`);
              response = createResponse; // for logging
            }
            break;

          case 'uploadPhoto':
            // --- VALIDASI RUNTIME ---
            if (
              !item.payload?.activityId ||
              !item.payload?.interviewId ||
              !item.payload?.photoFile
            ) {
              throw new Error('Payload untuk uploadPhoto tidak lengkap.');
            }
            // -------------------------

            response = await apiClient.uploadAssignmentPhoto(
              item.payload.activityId,
              item.payload.interviewId,
              item.payload.photoFile
            );
            break;
          default:
            console.warn('SyncEngine: Unknown sync item type:', item.type);
            await activityDB.syncQueue.delete(item.id!);
            continue;
        }

        console.log(`SyncEngine: Successfully synced ${item.type} (ID: ${item.id})`, response);
        await activityDB.syncQueue.delete(item.id!); // Remove from queue on success

        // After successful createAssignment, trigger a delta sync for the activity
        if (item.type === 'createAssignment' || item.type === 'createAssignmentWithPhoto') {
          // No longer need to call delta sync here as the UI is updated directly.
          // await dashboardStore.syncDelta(item.payload.activityId);
        }
      } catch (error: any) {
        console.error(`SyncEngine: Failed to sync ${item.type} (ID: ${item.id}):`, error);

        // Handle 409 Conflict specifically
        if (error.response && error.response.status === 409) {
          f7.dialog.alert(
            'Tugas ini telah diperbarui di server oleh perangkat lain. Perubahan lokal Anda tidak dapat dikirim. Mohon cadangkan data penting secara manual (misalnya, dengan tangkapan layar), lalu lakukan \'Sync Perubahan\' untuk mendapatkan versi terbaru dari server.',
            'Konflik Sinkronisasi'
          );
          await activityDB.syncQueue.delete(item.id!); // Delete from queue, no retry
        } else {
          const retries = (item.retries || 0) + 1;
          let status: SyncQueueItem['status'] = 'failed';
          if (retries <= MAX_RETRIES) {
            status = 'pending'; // Re-queue for retry
          }
          await activityDB.syncQueue.update(item.id!, { status, retries, error: error.message });
          f7.toast.show({
            text: `Gagal sinkronisasi ${item.type}: ${error.message || 'Terjadi kesalahan.'}`,
            position: 'bottom',
            closeTimeout: 5000,
            cssClass: 'error-toast',
          });
        }
      }
    }
    this.isProcessing = false;
    console.log('SyncEngine: Sync queue processing finished.');
  }
}

const syncEngine = new SyncEngine();
export default syncEngine;
