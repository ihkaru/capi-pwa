import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { f7 } from 'framework7-vue';
import { activityDB, Activity, Assignment, FormSchema, MasterSls } from '../services/offline/ActivityDB';
import { useAuthStore } from './auth';
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

        await activityDB.transaction('rw', 
          [activityDB.activities, activityDB.assignments, activityDB.formSchemas, activityDB.masterData, activityDB.masterSls],
          async () => {
            await activityDB.activities.put({ ...initialData.activity, user_id: user });
            await activityDB.formSchemas.put({ ...initialData.form_schema, activity_id: activityId, user_id: user });
            if (initialData.master_data?.length > 0) {
              const masterDataWithUserId = initialData.master_data.map(md => ({ ...md, activity_id: activityId, user_id: user }));
              await activityDB.masterData.bulkPut(masterDataWithUserId);
            }
            if (initialData.master_sls && Array.isArray(initialData.master_sls)) {
              await activityDB.masterSls.bulkPut(initialData.master_sls);
            }
            const assignmentsToStore = initialData.assignments.map(assign => ({ ...assign, activity_id: assign.kegiatan_statistik_id, user_id: user }));
            await activityDB.assignments.bulkPut(assignmentsToStore);
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
  };
});
