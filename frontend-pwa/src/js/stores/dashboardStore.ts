import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { f7 } from 'framework7-vue';
import { activityDB, Activity, Assignment, FormSchema, MasterSls } from '../services/offline/ActivityDB';
import { useAuthStore } from './authStore';
import apiClient from '../services/ApiClient';
import { useAppMetadataStore } from './appMetadata';

// Assuming syncEngine is correctly imported. Adjust path if necessary.
import syncEngine from '../services/sync/SyncEngine';

export const useDashboardStore = defineStore('dashboard', () => {
  const authStore = useAuthStore();
  const appMetadataStore = useAppMetadataStore();

  // --- STATE ---
  const isLoading = ref(false);
  const isSyncingInBackground = ref(false);
  const activity = ref<Activity | null>(null);
  const assignments = ref<Assignment[]>([]);
  const formSchema = ref<FormSchema | null>(null);
  const masterSls = ref<MasterSls[]>([]);

  const currentUserId = computed(() => authStore.user?.id);

  // --- GETTERS (COMPUTED) ---

  // Using a Map for efficient O(1) lookups is a good optimization.
  const masterSlsMap = computed(() => {
    return new Map(masterSls.value.map(s => [s.sls_id, s.nama]));
  });

  const statusSummary = computed(() => {
    if (!assignments.value) return {};
    return assignments.value.reduce((acc, assignment) => {
      const status = assignment.status || 'Assigned';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  });

  const groupedAssignments = computed(() => {
    console.log(`[CAPI-DEBUG] dashboardStore: Recalculating groupedAssignments. Total assignments: ${assignments.value.length}`);
    const result = assignments.value.reduce((acc, assignment) => {
      const groupLevelCodes: Partial<Assignment> = {
        level_1_code: assignment.level_1_code,
        level_1_label: assignment.level_1_label,
        level_2_code: assignment.level_2_code,
        level_2_label: assignment.level_2_label,
        level_3_code: assignment.level_3_code,
        level_3_label: assignment.level_3_label,
        level_4_code: assignment.level_4_code,
        level_4_label: assignment.level_4_label,
        level_5_code: assignment.level_5_code,
        level_5_label: assignment.level_5_label,
        level_6_code: assignment.level_6_code,
        level_6_label: assignment.level_6_label,
        level_4_code_full: assignment.level_4_code_full,
        level_6_code_full: assignment.level_6_code_full,
      };

      const getSlsLabel = (codeFull: string | null | undefined) => {
        return codeFull ? masterSlsMap.value.get(codeFull) || null : null;
      };

      let groupName = '';
      const isLevel4 = !assignment.level_5_code && !assignment.level_6_code;

      if (isLevel4) {
        const label = assignment.level_4_label || getSlsLabel(assignment.level_4_code_full);
        groupName = label || `Wilayah: ${assignment.level_4_code_full}`;
        groupLevelCodes.level_4_label = label;
      } else {
        const label = assignment.level_6_label || getSlsLabel(assignment.level_6_code_full);
        groupName = label || `Wilayah: ${assignment.level_6_code_full}`;
        groupLevelCodes.level_6_label = label;
      }

      if (!acc[groupName]) {
        acc[groupName] = {
          assignments: [],
          summary: {},
          total: 0,
          levelCodes: groupLevelCodes,
        };
      }
      
      acc[groupName].assignments.push(assignment);
      acc[groupName].total++;
      const status = assignment.status || 'Assigned';
      acc[groupName].summary[status] = (acc[groupName].summary[status] || 0) + 1;
      
      return acc;
    }, {} as Record<string, { assignments: Assignment[], summary: Record<string, number>, total: number, levelCodes: Partial<Assignment> }>);
    console.log(`[CAPI-DEBUG] dashboardStore: Recalculation finished. Number of groups: ${Object.keys(result).length}`);
    return result;
  });

  // --- ACTIONS ---

  async function loadDashboardData(activityId: string) {
    if (!currentUserId.value) return;
    try {
      const user = currentUserId.value;
      activity.value = await activityDB.activities.where({ id: activityId, user_id: user }).first() || null;

      formSchema.value = await activityDB.formSchemas.where({ activity_id: activityId, user_id: user }).first() || null;

      // Attach schema to activity object for unified access
      if (activity.value && formSchema.value) {
        activity.value.form_schema = formSchema.value.schema;
      }
      const allAssignments = await activityDB.assignments.where({ activity_id: activityId, user_id: user }).toArray();
      const assignmentIds = allAssignments.map(a => a.id);
      const responses = await activityDB.assignmentResponses.where('assignment_id').anyOf(assignmentIds).toArray();
      const responsesMap = new Map(responses.map(r => [r.assignment_id, r]));

      const combinedAssignments = allAssignments.map(asm => ({
        ...asm,
        response: responsesMap.get(asm.id) || null,
      }));

      assignments.value = combinedAssignments;
      
      // Use a Set to get unique SLS codes for a more efficient DB query
      const slsCodes = [...new Set(allAssignments.flatMap(a => [a.level_4_code_full, a.level_6_code_full]).filter(Boolean) as string[])];
      if (slsCodes.length > 0) {
        masterSls.value = await activityDB.masterSls.where('sls_id').anyOf(slsCodes).toArray();
      } else {
        masterSls.value = [];
      }

    } catch (error) {
      console.error('LOG-ERROR: [dashboardStore] loadDashboardData: Failed to load data from DexieDB', error);
      reset(); // Reset state on critical error
    }
  }

  async function syncDelta(activityId: string) {
    if (!currentUserId.value) {
      f7.toast.show({ text: 'Sync failed: User not found.', cssClass: 'error-toast' });
      return;
    }
    f7.dialog.preloader('Syncing Changes...');
    console.log('[CAPI-DEBUG] dashboardStore: syncDelta started.');
    try {
      const now = new Date().toISOString();
      const lastSyncTimestamp = await appMetadataStore.getMetadata(`lastSyncTimestamp_${currentUserId.value}_${activityId}`);
      console.log(`[CAPI-DEBUG] dashboardStore: syncDelta: lastSyncTimestamp is ${lastSyncTimestamp}`);
      
      const updates = await apiClient.getActivitiesDelta(activityId, lastSyncTimestamp || '1970-01-01T00:00:00Z');
      console.log('[CAPI-DEBUG] dashboardStore: syncDelta: Received updates from server:', JSON.parse(JSON.stringify(updates)));

      // --- FIX: Surgically update the state instead of full reload ---
      if (updates.assignments?.length > 0) {
        console.log(`[CAPI-DEBUG] dashboardStore: syncDelta: Upserting ${updates.assignments.length} assignments into Dexie & state.`);
        const assignmentsToUpsert = updates.assignments.map(assign => ({ ...assign, user_id: currentUserId.value, activity_id: activityId }));
        await activityDB.assignments.bulkPut(assignmentsToUpsert);
        
        // Update in-memory state
        assignmentsToUpsert.forEach(upsertAssignment);
      }

      if (updates.assignmentResponses?.length > 0) {
        console.log(`[CAPI-DEBUG] dashboardStore: syncDelta: Upserting ${updates.assignmentResponses.length} responses into Dexie.`);
        const responsesToUpsert = updates.assignmentResponses.map(res => ({ ...res, user_id: currentUserId.value }));
        await activityDB.assignmentResponses.bulkPut(responsesToUpsert);

        // Find the parent assignments for these responses and update them in memory
        for (const res of responsesToUpsert) {
            const parentAssignment = assignments.value.find(a => a.id === res.assignment_id);
            if (parentAssignment) {
                parentAssignment.response = res;
                parentAssignment.status = res.status;
                upsertAssignment(parentAssignment);
            }
        }
      }
      // --- END OF FIX ---

      await appMetadataStore.setMetadata(`lastSyncTimestamp_${currentUserId.value}_${activityId}`, now);
      f7.toast.show({ text: 'Changes synced successfully!', cssClass: 'success-toast', position: 'bottom', closeTimeout: 3000 });

    } catch (error) {
      console.error('LOG-ERROR: [dashboardStore] syncDelta failed:', error);
      f7.dialog.alert('Failed to sync changes.');
    } finally {
      console.log('[CAPI-DEBUG] dashboardStore: syncDelta finished.');
      f7.dialog.close();
    }
  }

  async function syncFull(activityId: string, bypassConfirmation = false) {
    if (!currentUserId.value) {
      f7.toast.show({ text: 'Sync failed: User not found.', cssClass: 'error-toast' });
      return;
    }

    const startSync = async () => {
      f7.dialog.preloader('Full Sync...');
      try {
        const user = currentUserId.value;

        // 1. Preserve PENDING assignments
        const pendingAssignments = await activityDB.assignments
          .where({ activity_id: activityId, user_id: user, status: 'PENDING' })
          .toArray();
        let pendingResponses = [];
        if (pendingAssignments.length > 0) {
          const pendingIds = pendingAssignments.map(a => a.id);
          pendingResponses = await activityDB.assignmentResponses
            .where('assignment_id').anyOf(pendingIds)
            .toArray();
        }

        // 2. Fetch fresh data from server BEFORE starting the transaction
        const initialData = await apiClient.getInitialData(activityId, false);

        // 3. Use a single transaction for the entire operation
        await activityDB.transaction('rw', 
          [activityDB.activities, activityDB.assignments, activityDB.assignmentResponses, activityDB.formSchemas, activityDB.masterData, activityDB.masterSls],
          async () => {
            // 3a. Clear all existing data for this activity
            const assignmentCollection = activityDB.assignments.where({ activity_id: activityId, user_id: user });
            const assignmentIds = await assignmentCollection.primaryKeys();
            await assignmentCollection.delete();
            if (assignmentIds.length > 0) {
                await activityDB.assignmentResponses.where('assignment_id').anyOf(assignmentIds).delete();
            }
            await activityDB.formSchemas.where({ activity_id: activityId, user_id: user }).delete();
            await activityDB.masterData.where({ activity_id: activityId, user_id: user }).delete();
            
            // Save fresh server data
            await activityDB.activities.put({ ...initialData.activity, user_id: user });
            await activityDB.formSchemas.put({ activity_id: activityId, user_id: user, schema: initialData.form_schema });
            if (initialData.master_data?.length > 0) {
              const masterDataWithUserId = initialData.master_data.map(md => ({ ...md, activity_id: activityId, user_id: user }));
              await activityDB.masterData.bulkPut(masterDataWithUserId);
            }
            if (initialData.master_sls?.length > 0) {
              await activityDB.masterSls.bulkPut(initialData.master_sls);
            }
            const assignmentsToStore = initialData.assignments.map(assign => ({ ...assign, activity_id: assign.kegiatan_statistik_id, user_id: user }));
            await activityDB.assignments.bulkPut(assignmentsToStore);
            if (initialData.assignmentResponses?.length > 0) {
              await activityDB.assignmentResponses.bulkPut(initialData.assignmentResponses);
            }

            // Re-add the preserved PENDING assignments and responses
            if (pendingAssignments.length > 0) {
                const plainPendingAssignments = JSON.parse(JSON.stringify(pendingAssignments));
                const plainPendingResponses = JSON.parse(JSON.stringify(pendingResponses));
                await activityDB.assignments.bulkPut(plainPendingAssignments);
                await activityDB.assignmentResponses.bulkPut(plainPendingResponses);
            }
        });

        // Reload store from local DB to reflect the changes
        await loadDashboardData(activityId);

        f7.toast.show({ text: 'Full sync successful!', cssClass: 'success-toast', position: 'bottom', closeTimeout: 3000 });

      } catch (error) {
        console.error('LOG-ERROR: [dashboardStore] syncFull failed:', error);
        f7.dialog.alert('Failed to perform full sync.');
      } finally {
        f7.dialog.close();
      }
    };

    if (bypassConfirmation) {
      await startSync();
    } else {
      f7.dialog.confirm(
        'This will refresh all data from the server, but new assignments not yet submitted will remain on your device. Continue?',
        'Confirm Full Sync',
        startSync
      );
    }
  }

  async function createNewAssignment(data: any) {
    if (!currentUserId.value || !activity.value) {
      throw new Error('Cannot create assignment: User not authenticated or activity not loaded.');
    }

    const newAssignmentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const user = currentUserId.value;
    let uploadedPhotoId: string | null = null;

    // Step 1: Handle photo upload if a photo is provided
    if (data.photo && navigator.onLine) {
      try {
        f7.dialog.preloader('Uploading Photo...');
        const uploadResponse = await apiClient.uploadAssignmentPhoto(activity.value.id, newAssignmentId, data.photo);
        uploadedPhotoId = uploadResponse.fileId || null;
      } catch (uploadError) {
        console.error('Failed to upload photo immediately:', uploadError);
        f7.toast.show({ text: 'Failed to upload photo. Assignment will be created without it.', position: 'bottom', cssClass: 'error-toast' });
      } finally {
        f7.dialog.close();
      }
    } else if (data.photo) {
        f7.toast.show({ text: 'Offline: Photo cannot be uploaded now. Assignment will be created without it.', position: 'bottom', cssClass: 'warning-toast' });
    }

    // Step 2: Construct the new assignment and response objects
    const newAssignment: Assignment = {
      id: newAssignmentId,
      satker_id: authStore.user?.satker_id || null,
      kegiatan_statistik_id: activity.value.id,
      ppl_id: user,
      pml_id: activity.value.pml_id || null,
      level_1_code: data.level_1_code || null,
      level_1_label: data.level_1_label || null,
      level_2_code: data.level_2_code || null,
      level_2_label: data.level_2_label || null,
      level_3_code: data.level_3_code || null,
      level_3_label: data.level_3_label || null,
      level_4_code: data.level_4_code || null,
      level_4_label: data.level_4_label || null,
      level_5_code: data.level_5_code || null,
      level_5_label: data.level_5_label || null,
      level_6_code: data.level_6_code || null,
      level_6_label: data.level_6_label || null,
      level_4_code_full: data.level_4_code_full || null,
      level_6_code_full: data.level_6_code_full || null,
      assignment_label: data.nama_krt,
      prefilled_data: { 
        nama_krt: data.nama_krt, 
        geotag: data.geotag,
        // Only include photo_id if upload was successful
        ...(uploadedPhotoId && { photo_id: uploadedPhotoId })
      },
      created_at: now,
      updated_at: now,
      status: 'PENDING',
      user_id: user,
    };

    const newAssignmentResponse = {
      assignment_id: newAssignmentId,
      user_id: user,
      status: 'PENDING',
      version: 1,
      form_version_used: formSchema.value?.form_version || 1,
      responses: {},
      created_at: now,
      updated_at: now,
    };

    // Step 3: Save to local DB and update state
    const plainAssignment = JSON.parse(JSON.stringify(newAssignment));
    const plainResponse = JSON.parse(JSON.stringify(newAssignmentResponse));
    
    await activityDB.transaction('rw', [activityDB.assignments, activityDB.assignmentResponses], async () => {
      await activityDB.assignments.add(plainAssignment);
      await activityDB.assignmentResponses.add(plainResponse);
    });

    // Update the local state to make the new assignment appear instantly
    assignments.value.push(plainAssignment);
    
    // Step 4: Queue the creation for background synchronization
    await syncEngine.queueForSync('createAssignment', {
      assignment: plainAssignment,
      assignmentResponse: plainResponse,
    });
  }

  function reset() {
    isLoading.value = false;
    isSyncingInBackground.value = false;
    activity.value = null;
    assignments.value = [];
    formSchema.value = null;
    masterSls.value = [];
    authStore.setActiveRole(null);
    console.log('DashboardStore: Reset.');
  }

  async function hasUnsyncedData(): Promise<boolean> {
    if (!currentUserId.value) return false;
    try {
      const unsyncedCount = await activityDB.assignments
        .where({ user_id: currentUserId.value, status: 'PENDING' })
        .count();
      return unsyncedCount > 0;
    } catch (error) {
      console.error('Error checking for unsynced data:', error);
      return false;
    }
  }

  // This is a helper function if you need to add an assignment from another part of the app
  function addAssignment(newAssignment: Assignment) {
    console.log(`[CAPI-DEBUG] dashboardStore: addAssignment called with id: ${newAssignment.id}. Current total: ${assignments.value.length}`);
    if (!assignments.value.some(a => a.id === newAssignment.id)) {
      assignments.value.push(newAssignment);
      console.log(`[CAPI-DEBUG] dashboardStore: Assignment added. New total: ${assignments.value.length}`);
    } else {
      console.warn(`[CAPI-WARN] dashboardStore: addAssignment: Assignment with id ${newAssignment.id} already exists.`);
    }
  }

  async function deletePendingAssignment(assignmentId: string) {
    return new Promise<void>((resolve, reject) => {
      f7.dialog.confirm( 'Are you sure you want to delete this assignment? This action cannot be undone.', 'Confirm Deletion',
        async () => {
          try {
            const assignmentToDelete = await activityDB.assignments.get(assignmentId);
            if (assignmentToDelete?.status !== 'PENDING') {
              f7.dialog.alert('Only assignments with PENDING status can be deleted.');
              return reject(new Error('Deletion not allowed'));
            }

            await activityDB.transaction('rw', [activityDB.assignments, activityDB.assignmentResponses], async () => {
              await activityDB.assignments.delete(assignmentId);
              await activityDB.assignmentResponses.where({ assignment_id: assignmentId }).delete();
            });

            const index = assignments.value.findIndex(a => a.id === assignmentId);
            if (index !== -1) assignments.value.splice(index, 1);

            f7.toast.show({ text: 'Assignment deleted successfully.', cssClass: 'success-toast', position: 'bottom', closeTimeout: 3000 });
            resolve();
          } catch (error) {
            console.error('Error deleting assignment:', error);
            f7.dialog.alert('Failed to delete assignment.');
            reject(error);
          }
        },
        () => reject(new Error('User cancelled'))
      );
    });
  }

  function upsertAssignment(assignment: Assignment) {
    const index = assignments.value.findIndex(a => a.id === assignment.id);
    if (index !== -1) {
      assignments.value[index] = assignment;
    } else {
      assignments.value.push(assignment);
    }
  }

  return {
    isLoading,
    isSyncingInBackground,
    activity,
    assignments,
    formSchema,
    masterSls,
    statusSummary,
    groupedAssignments,
    loadDashboardData,
    syncDelta,
    syncFull,
    reset,
    hasUnsyncedData,
    addAssignment,
    deletePendingAssignment,
    createNewAssignment,
    upsertAssignment,
    updateAssignmentInState(updatedAssignment: Assignment) {
      const index = assignments.value.findIndex(a => a.id === updatedAssignment.id);
      if (index !== -1) {
        assignments.value.splice(index, 1, updatedAssignment);
      } else {
        console.warn(`[CAPI-WARN] dashboardStore: Did not find assignment ${updatedAssignment.id} in state to update.`);
      }
    },
  };
});