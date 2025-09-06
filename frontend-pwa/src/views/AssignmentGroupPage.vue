<template>
  <f7-page>
    <f7-navbar :title="`Grup Wilayah - ${dashboardStore.activity?.name || ''}`" back-link="Kembali"></f7-navbar>

    <template v-if="dashboardStore.isLoading">
      <f7-block class="text-align-center"><f7-preloader /></f7-block>
    </template>

    <template v-else>
      <f7-block-title>Ringkasan Status per Wilayah</f7-block-title>

      <div v-if="Object.keys(dashboardStore.groupedAssignments).length === 0">
        <f7-block>
          <p>Tidak ada penugasan untuk ditampilkan dalam grup ini.</p>
        </f7-block>
      </div>

      <f7-card v-for="(groupData, groupName) in dashboardStore.groupedAssignments" :key="groupName">
        <f7-card-header>
          {{ groupName }} ({{ groupData.total }} tugas)
        </f7-card-header>
        <f7-card-content>
          <f7-list>
            <f7-list-item v-for="(count, status) in groupData.summary" :key="status" :title="status">
              <template #after>
                <f7-badge :color="getBadgeColorForStatus(status)">{{ count }}</f7-badge>
              </template>
            </f7-list-item>
          </f7-list>
        </f7-card-content>
        <f7-card-footer>
          <f7-link></f7-link>
          <f7-button small fill @click="navigateToGroup(groupName)">Lihat Detail</f7-button>
        </f7-card-footer>
      </f7-card>

    </template>

  </f7-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { f7 } from 'framework7-vue';
import { useDashboardStore } from '../js/stores/dashboardStore';
import { getBadgeColorForStatus } from '../js/utils/statusColors';

const props = defineProps({
  f7route: Object,
});

const dashboardStore = useDashboardStore();

onMounted(() => {
  const activityId = props.f7route?.params?.activityId;
  console.log(`AssignmentGroupPage: Page is active for activity ID: ${activityId}`);
  // Data seharusnya sudah dimuat oleh halaman dasbor sebelumnya,
  // tapi kita panggil lagi untuk memastikan jika halaman ini di-refresh langsung.
  if (activityId && dashboardStore.activity?.id !== activityId) {
    dashboardStore.loadDashboardData(activityId);
  }
  console.log(dashboardStore.groupedAssignments);
});

function navigateToGroup(groupName: string) {
  const activityId = props.f7route?.params?.activityId;
  if (activityId) {
    const encodedGroupName = encodeURIComponent(groupName);
    f7.views.main.router.navigate(`/activity/${activityId}/group/${encodedGroupName}/`);
  }
}
</script>
