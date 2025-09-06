import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { f7 } from 'framework7-vue';
import { activityDB, Activity, Assignment, FormSchema, MasterSls } from '../services/offline/ActivityDB';
import { useAuthStore } from './authStore';
import apiClient from '../services/ApiClient';

export const useDashboardStore = defineStore('dashboard', () => {
  const authStore = useAuthStore();

  // --- STATE ---
  const isLoading = ref(false);
  const isSyncingInBackground = ref(false);
  const activity = ref<Activity | null>(null);
  const assignments = ref<Assignment[]>([]);
  const formSchema = ref<FormSchema | null>(null);
  const masterSls = ref<MasterSls[]>([]);

  const currentUserId = computed(() => authStore.user?.id);

  // --- GETTERS (COMPUTED) ---
  const statusSummary = computed(() => {
    if (!assignments.value) return {};
    return assignments.value.reduce((acc, assignment) => {
      const status = assignment.status || 'Assigned';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  });

  const groupedAssignments = computed(() => {
    const groups = assignments.value.reduce((acc, assignment) => {
      let groupName = '';
      if ((assignment.level_5_code === null || assignment.level_5_code === '') && 
          (assignment.level_6_code === null || assignment.level_6_code === '')) {
        groupName = assignment.level_4_label || `Wilayah: ${assignment.level_4_code_full}`;
      } else {
        groupName = assignment.level_6_label || `Wilayah: ${assignment.level_6_code_full}`;
      }

      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(assignment);
      return acc;
    }, {} as Record<string, any[]>);

    const result = {};
    for (const groupName in groups) {
      const groupAssignments = groups[groupName];
      const summary = groupAssignments.reduce((acc, assignment) => {
        const status = assignment.status || 'Assigned';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      result[groupName] = {
        summary: summary,
        assignments: groupAssignments,
        total: groupAssignments.length,
      };
    }

    return result;
  });

  // --- ACTIONS ---

  async function loadDashboardData(activityId: string) {
    if (!currentUserId.value) return;
    console.log(`LOG: [dashboardStore] loadDashboardData: Membaca data dari DexieDB untuk activityId: ${activityId}`);
    try {
      const user = currentUserId.value;
      activity.value = await activityDB.activities.where({ id: activityId, user_id: user }).first() || null;
      
      // Set the active role in the auth store based on the activity context
      if (activity.value?.user_role) {
        authStore.setActiveRole(activity.value.user_role);
        console.log(`[dashboardStore] Active role set to: ${activity.value.user_role}`);
      } else {
        // Clear the role if the activity doesn't define one (should not happen in normal flow)
        authStore.setActiveRole(null);
        console.warn(`[dashboardStore] No user_role found for activity ${activityId}. Active role cleared.`);
      }

      formSchema.value = await activityDB.formSchemas.where({ activity_id: activityId, user_id: user }).first() || null;
      const allAssignments = await activityDB.assignments.where({ activity_id: activityId, user_id: user }).toArray();
      assignments.value = allAssignments;
      const slsCodes = allAssignments.map(a => a.level_6_code_full).filter(Boolean);
      masterSls.value = await activityDB.masterSls.where('sls_id').anyOf(slsCodes).toArray();
    } catch (error) {
      console.error('LOG-ERROR: [dashboardStore] loadDashboardData: Gagal memuat data dari DexieDB', error);
      activity.value = null;
      assignments.value = [];
      formSchema.value = null;
      masterSls.value = [];
    }
  }

  async function syncDelta(activityId: string) {
    if (!currentUserId.value) {
      f7.toast.show({ text: 'Sync gagal: Pengguna tidak ditemukan.', cssClass: 'error-toast' });
      return;
    }
    f7.dialog.preloader('Sinkronisasi Perubahan...');
    try {
      await syncFull(activityId, true); // Panggil syncFull tapi bypass konfirmasi

      f7.toast.show({ 
        text: 'Sinkronisasi perubahan berhasil!', 
        cssClass: 'success-toast',
        position: 'bottom',
        closeTimeout: 3000, 
      });
    } catch (error) {
      console.error('LOG-ERROR: [dashboardStore] syncDelta gagal:', error);
      f7.dialog.alert('Gagal melakukan sinkronisasi perubahan.');
    } finally {
      f7.dialog.close();
    }
  }

  async function syncFull(activityId: string, bypassConfirmation = false) {
    if (!currentUserId.value) {
      f7.toast.show({ text: 'Sync gagal: Pengguna tidak ditemukan.', cssClass: 'error-toast' });
      return;
    }

    const startSync = async () => {
      f7.dialog.preloader('Sinkronisasi Penuh...');
      try {
        const user = currentUserId.value;
        console.log(`LOG: [dashboardStore] syncFull: Menghapus data lokal untuk activityId: ${activityId}`);
        await activityDB.assignments.where({ activity_id: activityId, user_id: user }).delete();
        
        console.log(`LOG: [dashboardStore] syncFull: Mengambil semua data dari API...`);
        const initialData = await apiClient.getInitialData(activityId, false);

        // --- BEGIN CRITICAL DEBUG LOG ---
        console.log('[dashboardStore] Full initialData payload received from server:', JSON.stringify(initialData, null, 2));
        // --- END CRITICAL DEBUG LOG ---

        console.log('dashboardStore: Saving form schema to Dexie with activity_id:', activityId);
        console.log('dashboardStore: Schema object being saved:', initialData.form_schema);

        await activityDB.transaction('rw', 
          [activityDB.activities, activityDB.assignments, activityDB.assignmentResponses, activityDB.formSchemas, activityDB.masterData, activityDB.masterSls],
          async () => {
            await activityDB.activities.put({ ...initialData.activity, user_id: user });
            await activityDB.formSchemas.put({ activity_id: activityId, user_id: user, schema: initialData.form_schema });
            if (initialData.master_data?.length > 0) {
              const masterDataWithUserId = initialData.master_data.map(md => ({ ...md, activity_id: activityId, user_id: user }));
              await activityDB.masterData.bulkPut(masterDataWithUserId);
            }
            if (initialData.master_sls && Array.isArray(initialData.master_sls)) {
              await activityDB.masterSls.bulkPut(initialData.master_sls);
            }
            const assignmentsToStore = initialData.assignments.map(assign => ({ ...assign, activity_id: assign.kegiatan_statistik_id, user_id: user }));
            await activityDB.assignments.bulkPut(assignmentsToStore);

            if (initialData.assignmentResponses && Array.isArray(initialData.assignmentResponses)) {
              console.log(`[dashboardStore] Storing ${initialData.assignmentResponses.length} assignment responses from initial data.`);
              await activityDB.assignmentResponses.bulkPut(initialData.assignmentResponses);
            } else {
              console.warn('[dashboardStore] No assignmentResponses found in initial data from server.');
            }
          }
        );

        await loadDashboardData(activityId);
        f7.toast.show({ 
          text: 'Sinkronisasi penuh berhasil!', 
          cssClass: 'success-toast', 
          position: 'bottom',
          closeTimeout: 3000,
        });

      } catch (error) {
        console.error('LOG-ERROR: [dashboardStore] syncFull gagal:', error);
        f7.dialog.alert('Gagal melakukan sinkronisasi penuh.');
      } finally {
        f7.dialog.close();
      }
    };

    if (bypassConfirmation) {
      await startSync();
    } else {
      f7.dialog.confirm(
        'Ini akan menghapus semua data penugasan lokal untuk kegiatan ini dan mengunduh ulang dari server. Lanjutkan?',
        'Konfirmasi Sinkronisasi Penuh',
        async () => await startSync()
      );
    }
  }

  async function createNewAssignment(data: any) {
    if (!currentUserId.value || !activity.value) {
      throw new Error('Cannot create new assignment: User not authenticated or activity not loaded.');
    }

    const newAssignmentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const user = currentUserId.value;

    // Construct the new Assignment object
    const newAssignment: Assignment = {
      id: newAssignmentId,
      satker_id: authStore.user?.satker_id || null, // Assuming satker_id is available on authStore.user
      kegiatan_statistik_id: activity.value.id,
      ppl_id: user,
      pml_id: activity.value.pml_id || null, // Assuming PML is assigned at activity level or can be null
      // Prefilled geographical data
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
      // Collected initial data
      assignment_label: data.nama_krt, // Use KRT name as initial label
      prefilled_data: { nama_krt: data.nama_krt, geotag: data.geotag, photo: data.photo }, // Store initial collected data here
      created_at: now,
      updated_at: now,
      status: 'Assigned', // Initial status
      user_id: user, // For Dexie indexing
    };

    // Construct the new AssignmentResponse object
    const newAssignmentResponse = {
      assignment_id: newAssignmentId,
      user_id: user,
      status: 'Assigned',
      version: 1,
      form_version_used: formSchema.value?.form_version || 1,
      responses: {},
      created_at: now,
      updated_at: now,
    };

    await activityDB.transaction('rw', [activityDB.assignments, activityDB.assignmentResponses], async () => {
      await activityDB.assignments.add(newAssignment);
      await activityDB.assignmentResponses.add(newAssignmentResponse);
    });

    // Add to the current assignments list in the store
    assignments.value.push(newAssignment);

    // Queue for sync
    await syncEngine.queueForSync('createAssignment', {
      assignment: newAssignment,
      assignmentResponse: newAssignmentResponse,
      photo: data.photo, // Pass photo data for upload
    });

    console.log('New assignment created and queued for sync:', newAssignment);
  }

  function reset() {
    isLoading.value = false;
    isSyncingInBackground.value = false;
    activity.value = null;
    assignments.value = [];
    formSchema.value = null;
    masterSls.value = [];
    authStore.setActiveRole(null); // Clear active role on reset
    console.log('DashboardStore: Reset.');
  }

  async function hasUnsyncedData(): Promise<boolean> {
    if (!currentUserId.value) {
      console.log('Cannot check for unsynced data, no user ID found.');
      return false; // No user, no data
    }
    try {
      // Asumsi: status 'Assigned' adalah status awal dari server.
      // Status lain ('Submitted by PPL', 'Approved by PML', dll.) 
      // menunjukkan ada perubahan lokal yang mungkin belum sinkron.
      const unsyncedCount = await activityDB.assignments
        .where('user_id').equals(currentUserId.value)
        .and(assignment => assignment.status !== 'Assigned' && assignment.status !== null && assignment.status !== undefined && assignment.status !== '')
        .count();

      if (unsyncedCount > 0) {
        console.log(`Found ${unsyncedCount} unsynced assignments.`);
        return true;
      }
      
      // TODO: Di masa depan, ini bisa diperluas untuk memeriksa tabel lain
      // seperti 'surveyResults' jika ada.

      console.log('No unsynced data found.');
      return false;
    } catch (error) {
      console.error('Error checking for unsynced data:', error);
      return false; // Jika terjadi error, anggap tidak ada untuk mencegah user terjebak
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
    hasUnsyncedData, // <-- Ekspor aksi baru
  };
});
