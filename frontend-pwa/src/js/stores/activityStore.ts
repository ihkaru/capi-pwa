
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { f7 } from 'framework7-vue';
import apiClient from '../services/ApiClient';
import { activityDB } from '../services/offline/ActivityDB';
import { useAuthStore } from './authStore';
import { useAppMetadataStore } from './appMetadata';

export const useActivityStore = defineStore('activity', () => {
  const activities = ref([]);
  const isLoading = ref(false);
  const authStore = useAuthStore();
  const appMetadataStore = useAppMetadataStore();

  const currentUserId = computed(() => authStore.user?.id);

  async function fetchActivities(force = false) {
    if (isLoading.value && !force) return;

    console.log(`ActivityStore: fetchActivities started. Force fetch: ${force}`);
    if (!currentUserId.value) {
      f7.toast.show({ text: 'Tidak dapat memuat kegiatan: Pengguna tidak terautentikasi.', cssClass: 'error-toast' });
      return;
    }

    isLoading.value = true;

    // Selalu coba muat dari lokal dulu untuk UI yang cepat
    const localActivities = await activityDB.activities.where('user_id').equals(currentUserId.value).toArray();
    if (localActivities.length > 0) {
      activities.value = localActivities;
      console.log('ActivityStore: Loaded activities from local DB.');
    }

    // Cek koneksi sebelum fetch dari jaringan
    if (!navigator.onLine) {
      f7.toast.show({
        text: 'Anda sedang offline. Menampilkan data lokal.',
        position: 'bottom',
        closeTimeout: 3000,
      });
      isLoading.value = false;
      console.log('ActivityStore: Offline mode, skipping network fetch.');
      return;
    }

    // Lanjutkan fetch dari jaringan jika online
    try {
      f7.dialog.preloader('Memperbarui Kegiatan...');
      const fetchedActivities = await apiClient.getActivitiesForUser();

      if (fetchedActivities && fetchedActivities.length > 0) {
        const activitiesWithUserId = fetchedActivities.map(activity => ({ ...activity, user_id: currentUserId.value }));
        // Use bulkPut to non-destructively update local data
        await activityDB.activities.bulkPut(activitiesWithUserId);
        console.log(`ActivityStore: Upserted ${activitiesWithUserId.length} new/updated activities from API.`);
      } else {
        console.log('ActivityStore: No activities returned from API.');
      }

      // Selalu baca ulang dari DB untuk memastikan state sinkron
      activities.value = await activityDB.activities.where('user_id').equals(currentUserId.value).toArray();
      
      const now = new Date().toISOString();
      for (const activity of activities.value) {
        await appMetadataStore.setMetadata(`lastSyncTimestamp_${currentUserId.value}_${activity.id}`, now);
      }

    } catch (error) {
      console.error('Failed to fetch activities:', error);
      f7.toast.show({ text: 'Gagal memuat daftar kegiatan dari server.', cssClass: 'error-toast' });
    } finally {
      f7.dialog.close();
      isLoading.value = false;
      console.log('ActivityStore: fetchActivities finished.');
    }
  }

  async function syncActivities() {
    if (!currentUserId.value) {
      f7.toast.show({ text: 'Tidak dapat sinkronisasi: Pengguna tidak terautentikasi.', position: 'bottom', closeTimeout: 3000, cssClass: 'error-toast' });
      return;
    }
    isLoading.value = true;
    f7.dialog.preloader('Sinkronisasi Data...');
    try {
      const currentActivities = await activityDB.activities.where('user_id').equals(currentUserId.value).toArray();
      const now = new Date().toISOString();

      for (const activity of currentActivities) {
        const lastSyncTimestamp = await appMetadataStore.getMetadata(`lastSyncTimestamp_${currentUserId.value}_${activity.id}`);
        console.log(`Syncing activity ${activity.name} (ID: ${activity.id}) since ${lastSyncTimestamp || 'beginning'}`);

        const updates = await apiClient.getActivitiesDelta(activity.id, lastSyncTimestamp || '1970-01-01T00:00:00Z');

        if (updates.assignments && updates.assignments.length > 0) {
          const assignmentsWithUserId = updates.assignments.map(assign => ({ ...assign, user_id: currentUserId.value }));
          await activityDB.assignments.bulkPut(assignmentsWithUserId);
          console.log(`Synced ${updates.assignments.length} assignments for activity ${activity.id}`);
        }
        if (updates.assignmentResponses && updates.assignmentResponses.length > 0) {
          const responsesWithUserId = updates.assignmentResponses.map(res => ({ ...res, user_id: currentUserId.value }));
          await activityDB.assignmentResponses.bulkPut(responsesWithUserId);
          console.log(`Synced ${updates.assignmentResponses.length} assignment responses for activity ${activity.id}`);
        }
        await appMetadataStore.setMetadata(`lastSyncTimestamp_${currentUserId.value}_${activity.id}`, now);
      }
      activities.value = await activityDB.activities.where('user_id').equals(currentUserId.value).toArray();
      f7.toast.show({ text: 'Sinkronisasi berhasil!', position: 'bottom', closeTimeout: 3000, cssClass: 'success-toast' });
    } catch (error) {
      console.error('Failed to sync activities:', error);
      f7.toast.show({ text: 'Gagal melakukan sinkronisasi.', position: 'bottom', closeTimeout: 3000, cssClass: 'error-toast' });
    } finally {
      isLoading.value = false;
      f7.dialog.close();
    }
  }

  async function fullSyncActivities() {
    if (!currentUserId.value) {
      f7.toast.show({ text: 'Tidak dapat sinkronisasi penuh: Pengguna tidak terautentikasi.', position: 'bottom', closeTimeout: 3000, cssClass: 'error-toast' });
      return;
    }

    f7.dialog.confirm('Ini akan menghapus semua data kegiatan lokal dan mengunduh ulang dari server. Lanjutkan?', 'Sinkronisasi Penuh', async () => {
      isLoading.value = true;
      f7.dialog.preloader('Sinkronisasi Penuh...');
      try {
        const currentActivities = await activityDB.activities.where('user_id').equals(currentUserId.value).toArray();
        const now = new Date().toISOString();

        for (const activity of currentActivities) {
          console.log(`Performing full sync for activity ${activity.name} (ID: ${activity.id})`);
          await activityDB.assignments.where({ activity_id: activity.id, user_id: currentUserId.value }).delete();
          // This is a simplification; a more robust solution would trace dependencies.
          await activityDB.assignmentResponses.where('user_id').equals(currentUserId.value).and(res => res.assignment_id.startsWith(activity.id.substring(0, 8))).delete();

          const allData = await apiClient.getAllActivityData(activity.id);

          if (allData.assignments && allData.assignments.length > 0) {
            const assignmentsWithUserId = allData.assignments.map(assign => ({ ...assign, user_id: currentUserId.value }));
            await activityDB.assignments.bulkPut(assignmentsWithUserId);
          }
          if (allData.assignmentResponses && allData.assignmentResponses.length > 0) {
            const responsesWithUserId = allData.assignmentResponses.map(res => ({ ...res, user_id: currentUserId.value }));
            await activityDB.assignmentResponses.bulkPut(responsesWithUserId);
          }
          await appMetadataStore.setMetadata(`lastSyncTimestamp_${currentUserId.value}_${activity.id}`, now);
        }

        activities.value = await activityDB.activities.where('user_id').equals(currentUserId.value).toArray();
        f7.toast.show({ text: 'Sinkronisasi penuh berhasil!', position: 'bottom', closeTimeout: 3000, cssClass: 'success-toast' });
      } catch (error) {
        console.error('Failed to perform full sync:', error);
        f7.toast.show({ text: 'Gagal melakukan sinkronisasi penuh.', position: 'bottom', closeTimeout: 3000, cssClass: 'error-toast' });
      } finally {
        isLoading.value = false;
        f7.dialog.close();
      }
    });
  }

  function reset() {
    activities.value = [];
    isLoading.value = false;
    console.log('ActivityStore: Reset.');
  }

  return {
    activities,
    isLoading,
    fetchActivities,
    syncActivities,
    fullSyncActivities,
    reset, // <-- Ekspor aksi baru
  };
});
