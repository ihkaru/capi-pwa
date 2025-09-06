<template>
  <f7-page @page:beforein="onPageBeforeIn">
    <f7-navbar title="Beranda">
      <!-- Slot "after-inner" akan menempatkan progress bar di bawah judul navbar -->
      <template #after-inner>
        <!-- Progress bar ini akan muncul saat isLoading bernilai true -->
        <f7-progressbar v-if="isLoading" infinite class="position-absolute" />
      </template>
      <f7-nav-right>
        <f7-link @click="handleLogout">
          <ArrowRightSquare />
        </f7-link>
      </f7-nav-right>
    </f7-navbar>

    <!-- Sisa template tidak perlu diubah -->
    <template v-if="!isLoading && activities.length === 0">
      <f7-block-title>Tidak Ada Kegiatan</f7-block-title>
      <f7-block>
        <p>Anda tidak memiliki kegiatan aktif saat ini. Silakan hubungi administrator Anda.</p>
      </f7-block>
    </template>

    <template v-else-if="activities.length > 0">
      <f7-list media-list>
        <f7-list-item v-for="activity in activities" :key="activity.id" :title="activity.name" clickable
          @click="handleActivityClick(activity.id)">
          <template #footer>
            <f7-chip :text="String(activity.year)" />
            <f7-chip :text="activity.user_role" :color="getRoleChipColor(activity.user_role)" />
            <f7-chip :text="activity.status" :color="getStatusChipColor(activity.status)" />
            <f7-chip :text="`Mulai: ${activity.start_date}`" />
            <f7-chip :text="`Selesai: ${activity.end_date}`" />
          </template>
        </f7-list-item>
      </f7-list>
    </template>

  </f7-page>
</template>

<script setup lang="ts">
import { f7 } from 'framework7-vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../js/stores/authStore';
import { useActivityStore } from '../js/stores/activityStore';
import { ArrowRightSquare } from 'framework7-icons/vue';

const authStore = useAuthStore();
const activityStore = useActivityStore();

// Make state and getters reactive
const { activities, isLoading } = storeToRefs(activityStore);

const onPageBeforeIn = () => {
  // Panggil fetchActivities untuk memastikan data selalu segar
  // saat pengguna kembali ke halaman ini.
  console.log('HomePage: page:beforein event triggered. Fetching activities.');
  activityStore.fetchActivities();
}

async function handleLogout() {
  console.log('[HomePage] handleLogout: Initiating logout...');
  const didLogout = await authStore.logout();
  console.log('[HomePage] handleLogout: Logout process finished. Result:', didLogout);
  if (didLogout) {
    console.log('[HomePage] handleLogout: Navigating to /');
    f7.views.main.router.navigate('/', { clearPreviousHistory: true });
  } else {
    console.log('[HomePage] handleLogout: Navigation skipped because logout was cancelled.');
  }
}

function handleActivityClick(activityId) {
  console.log(`HomePage: Activity clicked, navigating to dashboard for activity ID: ${activityId}`);
  // Navigate to the dashboard for the selected activity
  f7.views.main.router.navigate(`/activity/${activityId}/dashboard`);
}

// UI helper functions remain in the component
function getRoleChipColor(role) {
  if (role === 'PPL') return 'green';
  if (role === 'PML') return 'blue';
  return 'gray';
}

function getStatusChipColor(status) {
  if (status === 'Berlangsung') return 'orange';
  if (status === 'Selesai') return 'gray';
  return 'gray';
}
</script>

<style scoped>
.position-absolute {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
}
</style>
