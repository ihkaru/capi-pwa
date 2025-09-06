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

    <f7-block v-if="dashboardStore.activity?.allow_new_assignments_from_pwa && authStore.activeRole === 'PPL'">
      <f7-button large fill @click="handleAddNewAssignment">
        <f7-icon f7="plus"></f7-icon>
        Tambah Assignment Baru
      </f7-button>
    </f7-block>

  </f7-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { f7 } from 'framework7-vue';
import { useDashboardStore } from '../js/stores/dashboardStore';
import { useUiStore } from '../js/stores/uiStore';
import { useAuthStore } from '../js/stores/authStore';
import { Assignment } from '../js/services/offline/ActivityDB';
import { getBackgroundColorForStatus } from '../js/utils/statusColors';
import AddNewAssignmentModal from '../components/AddNewAssignmentModal.vue';

const props = defineProps({
  f7route: Object,
});

const dashboardStore = useDashboardStore();
const uiStore = useUiStore();
const authStore = useAuthStore();

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

function handleAddNewAssignment() {
  const currentActivity = dashboardStore.activity;
  const currentGroup = dashboardStore.groupedAssignments[groupName.value];

  if (!currentActivity || !currentGroup) {
    f7.dialog.alert('Tidak dapat menambahkan penugasan baru: informasi kegiatan atau grup tidak lengkap.');
    return;
  }

  // Extract geographical codes from the first assignment in the group
  // Assuming all assignments in a group share the same geographical codes up to their grouping level
  const firstAssignmentInGroup = currentGroup.assignments[0];
  const prefilledGeoData = {
    level_1_code: firstAssignmentInGroup?.level_1_code,
    level_1_label: firstAssignmentInGroup?.level_1_label,
    level_2_code: firstAssignmentInGroup?.level_2_code,
    level_2_label: firstAssignmentInGroup?.level_2_label,
    level_3_code: firstAssignmentInGroup?.level_3_code,
    level_3_label: firstAssignmentInGroup?.level_3_label,
    level_4_code: firstAssignmentInGroup?.level_4_code,
    level_4_label: firstAssignmentInGroup?.level_4_label,
    level_5_code: firstAssignmentInGroup?.level_5_code,
    level_5_label: firstAssignmentInGroup?.level_5_label,
    level_6_code: firstAssignmentInGroup?.level_6_code,
    level_6_label: firstAssignmentInGroup?.level_6_label,
    level_4_code_full: firstAssignmentInGroup?.level_4_code_full,
    level_6_code_full: firstAssignmentInGroup?.level_6_code_full,
  };

  console.log('Prefilled Geographical Data for New Assignment:', prefilledGeoData);

  f7.popup.open(AddNewAssignmentModal, {
    props: {
      prefilledGeoData: prefilledGeoData,
    },
  });
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
