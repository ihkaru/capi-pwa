<template>
  <f7-page @page:afterin="onPageAfterIn">
    <f7-navbar :title="dashboardStore.activity ? dashboardStore.activity.name : 'Memuat Dasbor...'" back-link="Kembali">
      <template #after-inner>
        <f7-progressbar v-if="dashboardStore.isSyncingInBackground" infinite class="position-absolute" />
      </template>
    </f7-navbar>

    <template v-if="dashboardStore.isLoading">
      <f7-block class="text-align-center">
        <f7-preloader />
      </f7-block>
    </template>

    <template v-else-if="!dashboardStore.activity">
      <f7-block-title>Kegiatan Tidak Ditemukan</f7-block-title>
      <f7-block>
        <p>Data untuk kegiatan ini tidak ditemukan di perangkat Anda. Gunakan tombol di bawah untuk melakukan
          sinkronisasi.</p>
      </f7-block>
    </template>

    <template v-else>
      <f7-block-title>Ringkasan Status Penugasan</f7-block-title>
      <f7-card title="Total Penugasan" :subtitle="`${dashboardStore.assignments.length} Tugas`">
        <f7-list>
          <f7-list-item v-for="(count, status) in dashboardStore.statusSummary" :key="status" :title="status" link="#"
            @click="navigateToGroups">
            <template #after>
              <f7-badge :color="getBadgeColorForStatus(status)">{{ count }}</f7-badge>
            </template>
          </f7-list-item>
          <f7-list-item v-if="Object.keys(dashboardStore.statusSummary).length === 0"
            title="Tidak ada data status."></f7-list-item>
        </f7-list>
      </f7-card>
      <f7-block>
        <f7-button large fill @click="navigateToGroups">Lihat Detail Per Wilayah</f7-button>
      </f7-block>
    </template>

    <f7-block-title>Opsi Sinkronisasi</f7-block-title>
    <f7-block class="grid grid-cols-2 grid-gap">
      <f7-button large fill @click="handleDeltaSync">Sync Perubahan</f7-button>
      <f7-button large fill color="red" @click="handleFullSync">Sync Full</f7-button>
    </f7-block>

  </f7-page>
</template>

<script setup lang="ts">
import { f7 } from 'framework7-vue';
import { useDashboardStore } from '../js/stores/dashboardStore';
import { getBadgeColorForStatus } from '../js/utils/statusColors';

const props = defineProps({
  f7route: Object,
});

const dashboardStore = useDashboardStore();

// onPageAfterIn: Berjalan setiap kali halaman ditampilkan (termasuk saat navigasi kembali).
// Ini memastikan data di UI selalu fresh dari database lokal tanpa dialog yang mengganggu.
const onPageAfterIn = async () => {
  const activityId = props.f7route?.params?.activityId;
  console.log(`ActivityDashboardPage: Page is active for activity ID: ${activityId}`);
  if (activityId) {
    await dashboardStore.loadDashboardData(activityId);
  } else {
    console.error('ActivityDashboardPage: Missing activityId from route.');
    f7.toast.show({ text: 'ID Kegiatan tidak valid.', cssClass: 'error-toast' });
  }
};

async function handleDeltaSync() {
  const activityId = props.f7route?.params?.activityId;
  if (activityId) {
    await dashboardStore.syncDelta(activityId);
  }
}

async function handleFullSync() {
  const activityId = props.f7route?.params?.activityId;
  if (activityId) {
    await dashboardStore.syncFull(activityId);
  }
}

function navigateToGroups() {
  const activityId = props.f7route?.params?.activityId;
  if (activityId) {
    f7.views.main.router.navigate(`/activity/${activityId}/groups/`);
  }
}

</script>