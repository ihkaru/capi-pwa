<template>
  <f7-page @page:afterin="onPageAfterIn">
    <f7-navbar :title="groupName" back-link="Kembali"></f7-navbar>

    <f7-block-title>Daftar Penugasan</f7-block-title>
    <f7-card>
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th class="label-cell">Label Penugasan</th>
              <th class="label-cell">Status</th>
              <th class="actions-cell">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="assignment in assignmentsInGroup" :key="assignment.id"
              :style="{ backgroundColor: getBackgroundColorForStatus(assignment.status) }">
              <td class="label-cell">{{ assignment.assignment_label }}</td>
              <td class="label-cell">{{ assignment.status || 'Assigned' }}</td>
              <td class="actions-cell">
                <f7-button small fill @click="handleOpenAssignment(assignment.id)">Buka</f7-button>
              </td>
            </tr>
            <tr v-if="!assignmentsInGroup || assignmentsInGroup.length === 0">
              <td colspan="3" class="text-align-center">Tidak ada penugasan dalam grup ini.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </f7-card>
  </f7-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { f7 } from 'framework7-vue';
import { useDashboardStore } from '../js/stores/dashboardStore';
import { useUiStore } from '../js/stores/uiStore';
import { Assignment } from '../js/services/offline/ActivityDB';
import { getBackgroundColorForStatus } from '../js/utils/statusColors';

const props = defineProps({
  f7route: Object,
});

const dashboardStore = useDashboardStore();
const uiStore = useUiStore();

const groupName = computed(() => {
  const rawGroupName = props.f7route?.params?.groupName || '';
  return decodeURIComponent(rawGroupName);
});

const assignmentsInGroup = computed(() => {
  if (!groupName.value || !dashboardStore.groupedAssignments) {
    return [];
  }
  return dashboardStore.groupedAssignments[groupName.value]?.assignments || [];
});

function handleOpenAssignment(assignmentId: string) {
  console.log('AssignmentListPage: Navigating to assignment with ID:', assignmentId);
  f7.views.main.router.navigate(`/assignment/${assignmentId}/`);
}

function onPageAfterIn() {
  if (uiStore.shouldTriggerAssignmentListSync) {
    if (navigator.onLine) {
      const currentActivityId = dashboardStore.activity?.id;
      if (currentActivityId) {
        console.log('AssignmentListPage: Triggering delta sync after status change for activity:', currentActivityId);
        dashboardStore.syncDelta(currentActivityId);
      } else {
        console.warn('AssignmentListPage: No current activity ID found for delta sync.');
      }
    } else {
      console.log('AssignmentListPage: Offline, skipping delta sync after status change.');
    }
    // Always reset the flag after checking it
    uiStore.setShouldTriggerAssignmentListSync(false);
  } else {
    console.log('AssignmentListPage: Not triggered by status change, skipping delta sync.');
  }
}
</script>

<style scoped>
.data-table table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.data-table th {
  font-weight: bold;
  background-color: #f7f7f7;
}

.data-table .actions-cell {
  text-align: right;
}
</style>
