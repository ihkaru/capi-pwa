<template>
  <f7-page @page:afterin="onPageAfterIn">
    <f7-navbar :title="groupName" back-link="Kembali"></f7-navbar>

    <f7-block-title>Daftar Penugasan</f7-block-title>
    <f7-list strong-ios outline-ios dividers-ios>
      <f7-list-item v-for="assignment in assignmentsInGroup" :key="assignment.id" :title="assignment.assignment_label"
        :badge="assignment.status || 'Assigned'" :badge-color="getBadgeColorForStatus(assignment.status)" swipeout
        @click="handleOpenAssignment(assignment.id)">
        <f7-swipeout-actions right>
          <f7-swipeout-button v-if="authStore.activeRole === 'PPL' && assignment.status === 'PENDING'" color="red"
            @click.stop="handleDeleteAssignment(assignment.id)">
            Hapus
          </f7-swipeout-button>
        </f7-swipeout-actions>
      </f7-list-item>
      <f7-list-item v-if="!assignmentsInGroup || assignmentsInGroup.length === 0">
        <div class="text-align-center" style="width: 100%;">Tidak ada penugasan dalam grup ini.</div>
      </f7-list-item>
    </f7-list>

    <f7-fab position="right-bottom" slot="fixed"
      :if="dashboardStore.activity?.allow_new_assignments_from_pwa && authStore.activeRole === 'PPL'"
      @click="handleAddNewAssignment">
      <f7-icon f7="plus"></f7-icon>
    </f7-fab>

  </f7-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { f7 } from 'framework7-vue';
import { useDashboardStore } from '../js/stores/dashboardStore';
import { useUiStore } from '../js/stores/uiStore';
import { useAuthStore } from '../js/stores/authStore';
import { Assignment } from '../js/services/offline/ActivityDB';
import { getBadgeColorForStatus } from '../js/utils/statusColors';

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
  // Prevent navigation if a swipeout is open
  if (f7.swipeout.el) return;
  console.log('AssignmentListPage: Navigating to assignment with ID:', assignmentId);
  f7.views.main.router.navigate(`/assignment/${assignmentId}/`);
}

async function handleDeleteAssignment(assignmentId: string) {
  await dashboardStore.deletePendingAssignment(assignmentId);
  // Close swipeout after action
  f7.swipeout.close(f7.swipeout.el);
}

function onPageAfterIn() {
  const currentActivityId = dashboardStore.activity?.id;
  if (!currentActivityId) {
    console.warn('AssignmentListPage: No current activity ID found on page after in.');
    return;
  }

  if (uiStore.shouldTriggerAssignmentListSync) {
    if (navigator.onLine) {
      console.log('AssignmentListPage: Triggering delta sync after status change for activity:', currentActivityId);
      dashboardStore.syncDelta(currentActivityId);
    } else {
      console.log('AssignmentListPage: Offline, skipping delta sync after status change.');
    }
    uiStore.setShouldTriggerAssignmentListSync(false);
  }
}

function handleAddNewAssignment() {
  const currentActivity = dashboardStore.activity;
  const rawLevelCodes = props.f7route?.query?.levelCodes;
  let prefilledGeoData: Partial<Assignment> = {};

  if (rawLevelCodes) {
    try {
      prefilledGeoData = JSON.parse(decodeURIComponent(rawLevelCodes as string));
    } catch (e) {
      console.error('Error parsing levelCodes from URL:', e);
      f7.dialog.alert('Terjadi kesalahan saat memuat data wilayah. Silakan coba lagi.');
      return;
    }
  } else {
    const currentGroup = dashboardStore.groupedAssignments[groupName.value];
    if (currentGroup && currentGroup.assignments.length > 0) {
      const firstAssignmentInGroup = currentGroup.assignments[0];
      prefilledGeoData = {
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
    } else {
      f7.dialog.alert('Tidak dapat menambahkan penugasan baru: informasi kegiatan atau grup tidak lengkap.');
      return;
    }
  }

  if (!currentActivity) {
    f7.dialog.alert('Tidak dapat menambahkan penugasan baru: informasi kegiatan tidak lengkap.');
    return;
  }

  console.log('Prefilled Geographical Data for New Assignment:', prefilledGeoData);

  const encodedPrefilledGeoData = encodeURIComponent(JSON.stringify(prefilledGeoData));
  const activityId = currentActivity.id;
  const navigateUrl = `/assignment/new?activityId=${activityId}&prefilledGeoData=${encodedPrefilledGeoData}`;
  console.log('AssignmentListPage: Navigating to:', navigateUrl);
  f7.views.main.router.navigate(navigateUrl);
}
</script>

<style scoped>
/* Add any specific styles if needed */
</style>