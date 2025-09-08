<template>
  <f7-page @page:afterin="onPageAfterIn">
    <f7-navbar :title="groupName" back-link="Kembali">
      <f7-nav-right>
        <f7-link icon-f7="search" searchbar-enable=".searchbar-assignments"></f7-link>
        <f7-link icon-f7="arrow_up_arrow_down_circle" @click="isSortPopupOpened = true"></f7-link>
        <f7-link icon-f7="line_horizontal_3_decrease_circle" @click="isFilterPopupOpened = true"></f7-link>
      </f7-nav-right>
      <f7-searchbar class="searchbar-assignments" expandable placeholder="Cari Penugasan"
        :disable-button="!f7.device.aurora" @input="searchQuery = $event.target.value"
        @searchbar:clear="searchQuery = ''"></f7-searchbar>
    </f7-navbar>

    <f7-list strong-ios outline-ios dividers-ios accordion-list class="assignment-list">
      <f7-list-item v-if="!processedAssignments || processedAssignments.length === 0">
        <div class="text-align-center" style="width: 100%;">Tidak ada penugasan yang sesuai dengan filter.</div>
      </f7-list-item>

      <f7-list-item v-for="assignment in processedAssignments" :key="assignment.id" accordion-item swipeout :style="{ backgroundColor: getBackgroundColorForStatus(assignment.status) }">
        <template #title>
          <div class="item-title-row">
            <div v-for="col in defaultColumns" :key="col.key" class="title-cell">
              <span class="cell-label">{{ col.label }}</span>
              <span class="cell-value">{{ getDeepValue(assignment, col.key) }}</span>
            </div>
          </div>
        </template>
        <f7-swipeout-actions right>
          <f7-swipeout-button v-if="authStore.activeRole === 'PPL' && assignment.status === 'PENDING'" color="red"
            @click.stop="handleDeleteAssignment(assignment.id)">
            Hapus
          </f7-swipeout-button>
        </f7-swipeout-actions>
        <div class="accordion-item-content">
          <f7-block>
            <div class="expanded-content">
              <div v-for="col in otherColumns" :key="col.key" class="expanded-row">
                <span class="cell-label">{{ col.label }}:</span>
                <span class="cell-value">{{ getDeepValue(assignment, col.key) }}</span>
              </div>
              <!-- Tombol Buka dipindahkan ke sini -->
              <div class="action-cell-accordion">
                <f7-button small fill @click.stop="handleOpenAssignment(assignment.id)">Buka</f7-button>
              </div>
            </div>
          </f7-block>
        </div>
      </f7-list-item>
    </f7-list>

    <f7-fab position="right-bottom" slot="fixed"
      :if="dashboardStore.activity?.allow_new_assignments_from_pwa && authStore.activeRole === 'PPL'"
      @click="handleAddNewAssignment">
      <f7-icon f7="plus"></f7-icon>
    </f7-fab>

    <!-- Sort Popup -->
    <f7-popup :opened="isSortPopupOpened" @popup:closed="isSortPopupOpened = false">
      <f7-page>
        <f7-navbar title="Urutkan">
          <f7-nav-right>
            <f7-link popup-close>Tutup</f7-link>
          </f7-nav-right>
        </f7-navbar>
        <f7-list>
          <f7-list-item v-for="col in sortableColumns" :key="col.key" :title="col.label" @click="applySort(col.key)">
            <f7-icon f7="checkmark" v-if="sortConfig.key === col.key"></f7-icon>
          </f7-list-item>
        </f7-list>
      </f7-page>
    </f7-popup>

    <!-- Filter Popup -->
    <f7-popup :opened="isFilterPopupOpened" @popup:closed="isFilterPopupOpened = false">
      <f7-page>
        <f7-navbar title="Filter">
          <f7-nav-right>
            <f7-link @click="applyFilters">Terapkan</f7-link>
            <f7-link @click="resetFilters">Reset</f7-link>
          </f7-nav-right>
        </f7-navbar>
        <f7-list>
          <div v-for="(filter, index) in activeFilters" :key="index">
            <f7-list-item :title="getColDefinition(filter.key)?.label || 'Pilih Kolom'" smart-select>
              <select v-model="filter.key">
                <option v-for="col in filterableColumns" :value="col.key" :key="col.key">{{ col.label }}</option>
              </select>
            </f7-list-item>
            <f7-list-input
              v-if="getColDefinition(filter.key)?.type === 'string' || getColDefinition(filter.key)?.type === 'number'"
              label="Nilai" type="text"
              :placeholder="'Masukkan nilai untuk \'' + (getColDefinition(filter.key)?.label || '') + '\''"
              v-model:value="filter.value"></f7-list-input>
            <f7-list-item v-if="getColDefinition(filter.key)?.type === 'status_lookup'" title="Status" smart-select>
              <select v-model="filter.value">
                <option value="Assigned">Assigned</option>
                <option value="Submitted by PPL">Submitted by PPL</option>
                <option value="Approved by PML">Approved by PML</option>
                <option value="Rejected by PML">Rejected by PML</option>
              </select>
            </f7-list-item>
          </div>
          <f7-button @click="addFilter">Tambah Filter</f7-button>
        </f7-list>
      </f7-page>
    </f7-popup>

  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { f7 } from 'framework7-vue';
import { useDashboardStore } from '../js/stores/dashboardStore';
import { useUiStore } from '../js/stores/uiStore';
import { useAuthStore } from '../js/stores/authStore';
import { Assignment } from '../js/services/offline/ActivityDB';
import { getBackgroundColorForStatus } from '../js/utils/statusColors';
import { get } from 'lodash';

const props = defineProps({
  f7route: Object,
});

const dashboardStore = useDashboardStore();
const uiStore = useUiStore();
const authStore = useAuthStore();

const isSortPopupOpened = ref(false);
const isFilterPopupOpened = ref(false);
const searchQuery = ref('');

const sortConfig = ref<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
const activeFilters = ref<{ key: string; value: any; }[]>([]);

const groupName = computed(() => {
  const rawGroupName = props.f7route?.params?.groupName || '';
  return decodeURIComponent(rawGroupName);
});

const assignmentsInGroup = computed(() => {
  if (!groupName.value || !dashboardStore.groupedAssignments) return [];
  return dashboardStore.groupedAssignments[groupName.value]?.assignments || [];
});

const columns = computed(() => dashboardStore.activity?.form_schema?.assignment_table_columns || []);
const defaultColumns = computed(() => columns.value.filter(c => c.default));
const otherColumns = computed(() => columns.value.filter(c => !c.default));
const sortableColumns = computed(() => columns.value.filter(c => c.sortable));
const filterableColumns = computed(() => columns.value.filter(c => c.filterable));

const getColDefinition = (key: string) => columns.value.find(c => c.key === key);

const processedAssignments = computed(() => {
  let assignments = [...assignmentsInGroup.value];

  // Search Query Filtering
  if (searchQuery.value && searchQuery.value.trim() !== '') {
    const lowerCaseQuery = searchQuery.value.trim().toLowerCase();
    assignments = assignments.filter(assignment => {
      return filterableColumns.value.some(col => {
        const value = getDeepValue(assignment, col.key);
        return String(value).toLowerCase().includes(lowerCaseQuery);
      });
    });
  }

  // Advanced Filtering
  if (activeFilters.value.length > 0) {
    assignments = assignments.filter(assignment => {
      return activeFilters.value.every(filter => {
        if (!filter.key || filter.value === '' || filter.value === null) return true;

        const colDef = getColDefinition(filter.key);
        const val = getDeepValue(assignment, filter.key);

        if (val === null || val === undefined) return false;

        switch (colDef?.type) {
          case 'number':
            return Number(val) === Number(filter.value);
          case 'status_lookup':
            return val === filter.value;
          case 'string':
          default:
            return String(val).toLowerCase().includes(String(filter.value).toLowerCase());
        }
      });
    });
  }

  // Sorting
  if (sortConfig.value.key) {
    // Create a shallow copy before sorting to avoid mutating the original array
    assignments = [...assignments].sort((a, b) => {
      const key = sortConfig.value.key as string;
      const valA = getDeepValue(a, key);
      const valB = getDeepValue(b, key);

      if (valA < valB) return sortConfig.value.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.value.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
  return assignments;
});

function getDeepValue(obj: any, path: string) {
  if (path === 'status') return obj.status || 'Assigned';
  return get(obj, path, '-');
}

function handleOpenAssignment(assignmentId: string) {
  if (f7.swipeout.el) return;
  f7.views.main.router.navigate(`/assignment/${assignmentId}/`);
}

async function handleDeleteAssignment(assignmentId: string) {
  await dashboardStore.deletePendingAssignment(assignmentId);
  f7.swipeout.close(f7.swipeout.el);
}

function onPageAfterIn() {
  const currentActivityId = dashboardStore.activity?.id;
  if (!currentActivityId) return;

  if (uiStore.shouldTriggerAssignmentListSync) {
    if (navigator.onLine) {
      dashboardStore.syncDelta(currentActivityId);
    }
    uiStore.setShouldTriggerAssignmentListSync(false);
  }
}

function applySort(key: string) {
  if (sortConfig.value.key === key) {
    sortConfig.value.direction = sortConfig.value.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortConfig.value.key = key;
    sortConfig.value.direction = 'asc';
  }
  isSortPopupOpened.value = false;
}

function addFilter() {
  activeFilters.value.push({ key: '', value: '' });
}

function applyFilters() {
  activeFilters.value = activeFilters.value.filter(f => f.key && f.value);
  isFilterPopupOpened.value = false;
}

function resetFilters() {
  activeFilters.value = [];
  isFilterPopupOpened.value = false;
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

  const encodedPrefilledGeoData = encodeURIComponent(JSON.stringify(prefilledGeoData));
  const activityId = currentActivity.id;
  const navigateUrl = `/assignment/new?activityId=${activityId}&prefilledGeoData=${encodedPrefilledGeoData}`;
  f7.views.main.router.navigate(navigateUrl);
}
</script>

<style scoped>
.assignment-list .item-title-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.title-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-basis: 0;
  flex-grow: 1;
  padding: 0 8px;
}

.title-cell:first-child {
  padding-left: 0;
}

.title-cell:last-child {
  padding-right: 0;
}

.action-cell-accordion {
  display: flex;
  justify-content: flex-end;
  /* Posisikan tombol ke kanan */
  padding-top: 16px;
  /* Beri jarak dari konten di atasnya */
}

.cell-label {
  font-size: 12px;
  color: #8e8e93;
  margin-bottom: 2px;
}

.cell-value {
  font-size: 15px;
  font-weight: 500;
}

.expanded-content {
  padding: 8px 16px;
}

.expanded-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}
</style>