<template>
  <f7-page @page:afterin="onPageAfterIn">
    <f7-navbar :title="formStore.state.assignment?.assignment_label || 'Memuat...'" back-link="Kembali"></f7-navbar>



    <f7-block v-if="isRejectedByPmlOrAdmin && formStore.state.assignmentResponse?.notes" class="rejected-notes-block">
      <f7-block-header>Catatan Penolakan</f7-block-header>
      <div class="block-content">
        <p>{{ formStore.state.assignmentResponse.notes }}</p>
      </div>
    </f7-block>

    <!-- Main Action FAB -->
    <f7-fab position="right-bottom" slot="fixed">
      <f7-icon f7="plus"></f7-icon>
      <f7-icon f7="xmark"></f7-icon>
      <f7-fab-buttons position="top">
        <f7-fab-button label="Ringkasan Validasi" @click="summaryPopupOpened = true">
          <f7-icon f7="exclamationmark_triangle_fill"></f7-icon>
        </f7-fab-button>
        <f7-fab-button v-if="!isPmlMode && !isFormLocked" label="Submit" @click="submitForm" :disabled="isFormLocked">
          <f7-icon f7="paperplane_fill"></f7-icon>
        </f7-fab-button>
        <f7-fab-button v-if="isPmlMode && allowedActions.includes('APPROVE')" label="Approve"
          @click="() => handlePmlAction('approve')">
          <f7-icon f7="checkmark"></f7-icon>
        </f7-fab-button>
        <f7-fab-button v-if="isPmlMode && allowedActions.includes('REJECT')" label="Reject" color="red"
          @click="() => handlePmlAction('reject')">
          <f7-icon f7="xmark"></f7-icon>
        </f7-fab-button>
        <f7-fab-button v-if="isPmlMode && allowedActions.includes('REVERT_APPROVAL')" label="Batalkan Persetujuan"
          color="orange" @click="handleRevertApproval">
          <f7-icon f7="arrow_uturn_left"></f7-icon>
        </f7-fab-button>
      </f7-fab-buttons>
    </f7-fab>

    <!-- Summary Popup -->
    <f7-popup :opened="summaryPopupOpened" @popup:closed="summaryPopupOpened = false">
      <f7-page>
        <f7-navbar title="Ringkasan Validasi">
          <template #right>
            <f7-link popup-close>Close</f7-link>
          </template>
        </f7-navbar>
        <div class="list simple-list" v-if="validationSummary">
          <ul>
            <li>
              <span>Terjawab</span>
              <span class="badge color-green">{{ validationSummary.answeredCount }}</span>
            </li>
            <li @click="() => { if (formStore.validationSummary.errorCount > 0) openSummarySheet('errors'); }"
              class="item-link" :class="{ disabled: validationSummary.errorCount === 0 }">
              <div class="item-content">
                <div class="item-inner">
                  <div class="item-title">Error</div>
                  <div class="item-after"><span class="badge color-red">{{ validationSummary.errorCount }}</span></div>
                </div>
              </div>
            </li>
            <li @click="() => { if (formStore.validationSummary.warningCount > 0) openSummarySheet('warnings'); }"
              class="item-link" :class="{ disabled: validationSummary.warningCount === 0 }">
              <div class="item-content">
                <div class="item-inner">
                  <div class="item-title">Warning</div>
                  <div class="item-after"><span class="badge color-orange">{{ validationSummary.warningCount }}</span>
                  </div>
                </div>
              </div>
            </li>
            <li @click="() => { if (formStore.validationSummary.blankCount > 0) openSummarySheet('blanks'); }"
              class="item-link" :class="{ disabled: validationSummary.blankCount === 0 }">
              <div class="item-content">
                <div class="item-inner">
                  <div class="item-title">Kosong</div>
                  <div class="item-after"><span class="badge color-gray">{{ validationSummary.blankCount }}</span></div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </f7-page>
    </f7-popup>

    <!-- Details Sheet -->
    <f7-sheet class="summary-sheet" :opened="summarySheetOpened" @sheet:closed="summarySheetOpened = false"
      swipe-to-close backdrop>
      <f7-page-content>
        <f7-block-title>Detail {{ visibleSummaryCategory }}</f7-block-title>
        <f7-list>
          <template v-if="visibleSummaryCategory === 'errors'">
            <f7-list-item v-for="error in validationSummary.errors" :key="error.questionId" :title="error.label"
              :subtitle="error.message" link @click="() => scrollToQuestion(error.questionId)"></f7-list-item>
          </template>
          <template v-if="visibleSummaryCategory === 'warnings'">
            <f7-list-item v-for="warning in validationSummary.warnings" :key="warning.questionId" :title="warning.label"
              :subtitle="warning.message" link @click="() => scrollToQuestion(warning.questionId)"></f7-list-item>
          </template>
          <template v-if="visibleSummaryCategory === 'blanks'">
            <f7-list-item v-for="blank in validationSummary.blanks" :key="blank.questionId" :title="blank.label" link
              @click="() => scrollToQuestion(blank.questionId)"></f7-list-item>
          </template>
        </f7-list>
      </f7-page-content>
    </f7-sheet>

    <div v-if="formStore.state.status === 'loading'" class="text-align-center loading-container">
      <f7-preloader />
      <p>Memuat formulir...</p>
    </div>

    <div v-if="formStore.state.status === 'error'" class="text-align-center error-container">
      <p>Gagal memuat formulir. Pastikan data sudah disinkronkan.</p>
    </div>

    <template v-if="formStore.state.status === 'ready' && formStore.pages">
      <f7-block-title class="page-title">Halaman {{ currentPageIndex + 1 }} dari {{ formStore.pages.length }}: {{
        currentPage.title }}</f7-block-title>

      <f7-list form class="no-hairlines form-inputs-list">
        <QuestionRenderer v-for="question in currentPage.questions" :key="question.id" :question="question"
          :responses="formStore.responses" :disabled="isQuestionDisabled(question)" :assignmentId="currentAssignmentId"
          :validationErrors="validationErrors" :getImageSrc="getImageSrc" :full-question-id="question.id"
          @update:response="handleUpdateResponse" @file-selected="handleFileSelected" @image-click="handleImageClick"
          @open-camera="openCamera" @capture-geotag="handleGeotagCapture"
          :ref="(el) => { if (el) questionRendererRefs[question.id] = el }" />
      </f7-list>

      <f7-block class="form-nav-container">
        <div class="form-nav-buttons">
          <f7-button large :disabled="currentPageIndex === 0" @click="prevPage" class="nav-button prev-button">
            <f7-icon f7="chevron_left" class="margin-right-half"></f7-icon>
            Sebelumnya
          </f7-button>
          <f7-button large fill :disabled="currentPageIndex >= formStore.pages.length - 1" @click="nextPage"
            class="nav-button next-button">
            Selanjutnya
            <f7-icon f7="chevron_right" class="margin-left-half"></f7-icon>
          </f7-button>
        </div>
      </f7-block>

      <!-- FAB Safe Area: Prevents the FAB from overlapping the content above it -->
      <div class="fab-safe-area"></div>
    </template>
  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { f7, f7Icon, f7BlockContent } from 'framework7-vue';
import { useFormStore } from '@/js/stores/formStore';
import { useAuthStore } from '@/js/stores/authStore';
import { useUiStore } from '@/js/stores/uiStore';
import { debounce } from 'lodash-es';
import { Geolocation } from '@capacitor/geolocation';
import RosterList from '@/components/RosterList.vue';
import QuestionRenderer from '@/components/QuestionRenderer.vue';
import { executeLogic } from '@/js/services/logicEngine';
import ApiClient from '@/js/services/ApiClient';
import GeotagPreview from '@/components/GeotagPreview.vue';
import { activityDB } from '@/js/services/offline/ActivityDB';

const props = defineProps({ f7route: Object });

const formStore = useFormStore();
const authStore = useAuthStore();
const uiStore = useUiStore();
const currentPageIndex = ref(0);
const summaryPopupOpened = ref(false);
const summarySheetOpened = ref(false);
const questionRendererRefs = ref({});
const visibleSummaryCategory = ref('');
const localPreviewUrls = ref(new Map<string, string>());

const isPmlMode = ref(false);
const allowedActions = ref([]);

const isRejectedByPmlOrAdmin = computed(() => {
  const status = formStore.state.assignmentResponse?.status;
  return status === 'Rejected by PML' || status === 'Rejected by Admin';
});

const validationSummary = computed(() => formStore.validationSummary);

const getApiRoot = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  return apiUrl.replace('/api', '');
}

const getImageSrc = (value: any) => {
  // NEW LOGIC
  if (!value) return '';

  // 1. Handle local blobs from the new reactive cache
  if (typeof value === 'object' && value.localId) {
    const cachedUrl = formStore.photoBlobCache.get(value.localId);
    if (cachedUrl) {
      console.log(`[CAPI-LOG] getImageSrc: Found cached blob URL for localId ${value.localId}`);
      return cachedUrl;
    }
    console.warn(`[CAPI-WARN] getImageSrc: No blob URL found in cache for localId ${value.localId}. The image may not appear.`);
    return ''; // Return empty if not found to avoid broken image links
  }

  // 2. Handle synced images (value is the stored path)
  if (typeof value === 'string' && !value.startsWith('data:image')) {
    const src = `${getApiRoot()}/storage/${value}`;
    console.log(`[CAPI-LOG] getImageSrc: Using synced image URL: ${src}`);
    return src;
  }

  // 3. Fallback for old base64 data for backward compatibility
  if (typeof value === 'string' && value.startsWith('data:image')) {
    console.log('[CAPI-LOG] getImageSrc: Using fallback base64 data URL.');
    return value;
  }

  console.log('[CAPI-LOG] getImageSrc: Value is not a recognized image format.', value);
  return '';
};


const currentPage = computed(() => {
  return formStore.pages[currentPageIndex.value] || { title: '', questions: [] };
});

// This computed property is naturally reactive.
// When formStore.validationMap changes, this will re-compute and update the UI.
const validationErrors = computed(() => {
  return formStore.validationMap || new Map();
});

const isFormLocked = computed(() => {
  const status = formStore.state.assignmentResponse?.status;
  const role = authStore.activeRole;

  if (role === 'PPL') {
    const editableStatuses = ['Opened', 'Assigned', 'PENDING', 'Rejected by PML', 'Rejected by Admin'];
    return !editableStatuses.includes(status);
  }
  // For PML or any other role, the form is not locked by this global flag.
  // Field-level disabling will be handled separately.
  return false;
});

const handleImageClick = (question: any) => {
  const imageValue = formStore.responses[question.id];
  if (!imageValue) return;

  // If the field is disabled for the current user (e.g. PML mode), always show the viewer.
  // Also show viewer if the image is already synced (i.e., not a local base64 data URL).
  const isSyncedImage = typeof imageValue === 'string' && !imageValue.startsWith('data:image');
  if (isQuestionDisabled(question) || isSyncedImage) {
    const imageUrl = getImageSrc(imageValue); // Use the existing helper to get the full URL
    const photoBrowser = f7.photoBrowser.create({
      photos: [{ url: imageUrl, caption: question.label }],
      type: 'standalone',
      theme: 'dark',
      popupCloseLinkText: 'Tutup'
    });
    photoBrowser.open();
  } else {
    // Otherwise, for an editable field with a local image, allow changing the photo.
    openCamera(question.id);
  }
};

const isQuestionDisabled = (question: any) => {
  const role = authStore.activeRole;
  const status = formStore.state.assignmentResponse?.status;

  // Global lock for PPL takes precedence
  if (isFormLocked.value) {
    return true;
  }

  // Logic for PML
  if (role === 'PML') {
    // PML can only edit when status is 'Submitted by PPL'
    if (status !== 'Submitted by PPL') {
      return true;
    }
    // Check the editableBy property in the form schema
    if (question.editableBy && Array.isArray(question.editableBy)) {
      return !question.editableBy.includes('PML');
    }
    // If editableBy is not defined, default to read-only for PML
    return true;
  }

  // Default case for PPL on an unlocked form
  return false;
};

function openSummarySheet(category: string) {
  summaryPopupOpened.value = false;
  nextTick(() => {
    visibleSummaryCategory.value = category;
    summarySheetOpened.value = true;
  });
}

const currentAssignmentId = computed(() => formStore.state.assignment?.id);

async function fetchAllowedActions() {
  try {
    if (!currentAssignmentId.value) return; // Don't fetch if no assignment ID
    const actions = await ApiClient.getAllowedActions(currentAssignmentId.value);
    allowedActions.value = actions;
  } catch (error) {
    console.error("Failed to fetch allowed actions:", error);
    allowedActions.value = [];
  }
}

function handlePmlAction(actionType: 'approve' | 'reject') {
  if (actionType === 'reject') {
    f7.dialog.prompt('Mohon masukkan alasan penolakan (opsional)', 'Konfirmasi Tolak', async (notes) => {
      try {
        f7.dialog.preloader('Menolak...');
        await formStore.rejectAssignment(notes);
        f7.dialog.close();
        uiStore.setShouldTriggerAssignmentListSync(true);
        f7.toast.show({ text: 'Formulir berhasil ditolak dan masuk antrean sinkronisasi!', closeTimeout: 3000 });
        f7.views.main.router.back();
      } catch (error) {
        f7.dialog.close();
        console.error('Failed to reject assignment:', error);
        f7.dialog.alert('Gagal melakukan penolakan. Silakan coba lagi.', 'Error');
      }
    });
  } else {
    f7.dialog.confirm('Apakah Anda yakin ingin menyetujui data ini?', 'Konfirmasi Setuju', async () => {
      try {
        f7.dialog.preloader('Menyetujui...');
        await formStore.approveAssignment();
        f7.dialog.close();
        uiStore.setShouldTriggerAssignmentListSync(true);
        f7.toast.show({ text: 'Formulir berhasil disetujui dan masuk antrean sinkronisasi!', closeTimeout: 3000 });
        f7.views.main.router.back();
      } catch (error) {
        f7.dialog.close();
        console.error('Failed to approve assignment:', error);
        f7.dialog.alert('Gagal melakukan persetujuan. Silakan coba lagi.', 'Error');
      }
    });
  }
}

async function handleRevertApproval() {
  f7.dialog.prompt('Mohon masukkan alasan pembatalan persetujuan (opsional)', 'Batalkan Persetujuan', async (notes) => {
    try {
      f7.dialog.preloader('Membatalkan persetujuan...');
      await formStore.revertApproval(notes);
      f7.dialog.close();
      uiStore.setShouldTriggerAssignmentListSync(true);
      f7.toast.show({ text: 'Persetujuan berhasil dibatalkan dan masuk antrean sinkronisasi!', closeTimeout: 3000 });
      f7.views.main.router.back();
    } catch (error) {
      f7.dialog.close();
      console.error('Failed to revert approval:', error);
      f7.dialog.alert('Gagal membatalkan persetujuan. Silakan coba lagi.', 'Error');
    }
  });
}

function findQuestionPage(questionId: string): number {
  const questionIdParts = questionId.split('.');
  const rootQuestionId = questionIdParts[0];
  return formStore.pages.findIndex(page => page.questions.some(q => q.id === rootQuestionId));
}

async function scrollToQuestion(questionId: string) {
  summarySheetOpened.value = false;
  const questionIdParts = questionId.split('.');
  const pageIndex = findQuestionPage(questionId);

  if (pageIndex !== -1 && pageIndex !== currentPageIndex.value) {
    currentPageIndex.value = pageIndex;
    await nextTick();
  }

  if (questionIdParts.length > 1) {
    const rosterId = questionIdParts[0];
    const itemIndex = questionIdParts[1];
    const nestedQuestionId = questionIdParts.slice(2).join('.');
    f7.views.main.router.navigate(`/interview/${currentAssignmentId.value}/roster/${rosterId}/${itemIndex}?scrollTo=${nestedQuestionId}`);
  } else {
    const el = document.querySelector(`[data-question-id="${questionId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function onPageAfterIn() {
  // Placeholder for now
}

function onPageBeforeOut() {
  // Revoke all local preview URLs to prevent memory leaks
  localPreviewUrls.value.forEach(url => URL.revokeObjectURL(url));
  localPreviewUrls.value.clear();
}

onMounted(() => {
  const routePath = props.f7route?.path;
  const queryAssignmentId = props.f7route?.query?.assignmentId; // 'new' for new assignments
  const paramAssignmentId = props.f7route?.params?.assignmentId; // Actual ID for existing assignments
  const activityId = props.f7route?.query?.activityId; // Get activityId from query

  console.log('InterviewFormPage: onMounted triggered.');
  console.log('InterviewFormPage: routePath:', routePath);
  console.log('InterviewFormPage: queryAssignmentId (from query): ', queryAssignmentId);
  console.log('InterviewFormPage: paramAssignmentId (from params): ', paramAssignmentId);
  console.log('InterviewFormPage: activityId from query:', activityId);

  if (routePath === '/assignment/new') {
    // Create mode
    console.log('InterviewFormPage: Entering create mode.');
    const encodedPrefilledGeoData = props.f7route?.query?.prefilledGeoData;
    let prefilledGeoData = {};
    if (encodedPrefilledGeoData) {
      try {
        prefilledGeoData = JSON.parse(decodeURIComponent(encodedPrefilledGeoData));
        console.log('InterviewFormPage: Parsed prefilledGeoData:', prefilledGeoData);
      } catch (e) {
        console.error('InterviewFormPage: Failed to parse prefilledGeoData from URL:', e);
      }
    }
    formStore.initializeNewAssignment(activityId, prefilledGeoData); // Pass activityId
    console.log('InterviewFormPage: formStore.initializeNewAssignment called.');
  } else if (paramAssignmentId) {
    // Edit mode for existing assignment
    console.log('InterviewFormPage: Entering edit mode for existing assignment.');
    formStore.loadAssignmentFromLocalDB(paramAssignmentId);
    console.log('InterviewFormPage: formStore.loadAssignmentFromLocalDB called.');
  }
  if (authStore.activeRole === 'PML') {
    isPmlMode.value = true;
    fetchAllowedActions();
    console.log('InterviewFormPage: PML mode detected, fetching allowed actions.');
  }
});

onUnmounted(() => {
  formStore.clearPhotoBlobCache();
  console.log('[CAPI-LOG] InterviewFormPage unmounted, photo cache cleared.');
});

// Since v-model updates the store directly, the watcher on responses
// will trigger the debounced save automatically.
const debouncedSave = debounce(() => {
  formStore.saveResponsesToLocalDB();
}, 1500);

watch(() => formStore.responses, debouncedSave, { deep: true });

const debouncedLabelUpdate = debounce(() => {
  if (formStore.state.isNew) { // Only update labels for new assignments
    formStore.updateAssignmentLabel();
  }
}, 500); // Debounce to avoid rapid updates while typing

watch(() => formStore.responses, debouncedLabelUpdate, { deep: true });

function handleUpdateResponse({ questionId, value }) {
  formStore.updateResponse(questionId, value);
}

function openCamera(questionId: string) {
  const rendererInstance = questionRendererRefs.value[questionId];
  if (rendererInstance) {
    rendererInstance.triggerFileInputClick();
  }
}

async function handleFileSelected(questionId: string, event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || !target.files[0]) return;

  const file = target.files[0];
  const userId = authStore.user?.id;

  if (!userId) {
    f7.dialog.alert('Tidak dapat menyimpan foto: pengguna tidak terautentikasi.', 'Error');
    return;
  }

  try {
    const localPhotoId = crypto.randomUUID();
    await activityDB.photoBlobs.add({ id: localPhotoId, user_id: userId, blob: file });

    // NEW: Add the new photo to the store's cache immediately
    formStore.addPhotoToCache(localPhotoId, file);

    // Update the response with a simple object, not the temporary URL
    formStore.updateResponse(questionId, { localId: localPhotoId });

    f7.toast.show({ text: 'Foto berhasil disimpan secara lokal!', closeTimeout: 2000 });

  } catch (error) {
    console.error('Gagal menyimpan foto secara lokal:', error);
    f7.dialog.alert('Gagal menyimpan foto secara lokal.', 'Error Penyimpanan');
  }
}

async function handleGeotagCapture(questionId: string) {
  try {
    f7.dialog.preloader('Mengambil Lokasi...');
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    f7.dialog.close();
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString(),
    };
    formStore.updateResponse(questionId, location);
  } catch (error) {
    f7.dialog.close();
    console.error('Gagal mengambil geotag:', error);
    f7.toast.show({ text: 'Gagal mengambil geotag. Pastikan GPS aktif.', position: 'bottom', closeTimeout: 3000 });
  }
}

function nextPage() {
  if (currentPageIndex.value < formStore.pages.length - 1) {
    currentPageIndex.value++;
  }
}

function prevPage() {
  if (currentPageIndex.value > 0) {
    currentPageIndex.value--;
  }
}

function submitForm() {
  // First, check for validation errors
  if (formStore.validationSummary.errorCount > 0) {
    f7.dialog.alert('Masih ada isian yang salah (error). Mohon perbaiki sebelum submit.', 'Validasi Gagal');
    return;
  }

  f7.dialog.confirm('Apakah Anda yakin ingin menandai formulir ini sebagai selesai dan mengirimnya?', 'Konfirmasi Submit', async () => {
    try {
      f7.dialog.preloader('Submitting...');

      // ✅ Use the unified 'submit' action from the refactored store
      await formStore.submit();

      f7.dialog.close();
      uiStore.setShouldTriggerAssignmentListSync(true);
      f7.toast.show({ text: 'Formulir berhasil di-submit dan masuk antrean sinkronisasi!', closeTimeout: 3000 });
      f7.views.main.router.back();
    } catch (error) {
      f7.dialog.close();
      console.error('Failed to submit assignment:', error);
      f7.dialog.alert('Gagal melakukan submit. Silakan coba lagi.', 'Error');
    }
  });
}
</script>

<style scoped>
/* Loading and error states */
.loading-container,
.error-container {
  padding: 32px 16px;
}

/* Rejected Notes Block */
.rejected-notes-block {
  margin: 16px;
  padding: 16px;
  background-color: #ffebee;
  /* Light red background */
  border-left: 5px solid #ef5350;
  /* Red border */
  border-radius: 4px;
  color: #b71c1c;
  /* Dark red text */
  font-weight: 500;
}

.rejected-notes-block .block-header {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #b71c1c;
}

.rejected-notes-block p {
  margin-bottom: 0;
  line-height: 1.5;
}

/* Page title styling */
.page-title {
  margin: 16px 0 8px 0;
  padding: 0 16px;
}

/* Main container for form inputs with consistent horizontal padding */
.form-inputs-list {
  padding: 0 16px;
  margin-top: 8px;
}

/* A single form question group with increased bottom margin for spacing */
.form-group {
  margin-bottom: 32px;
}

.form-label {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  line-height: 1.4;
}

.required-indicator {
  color: var(--f7-color-red);
  margin-left: 4px;
}

/* Input styling improvements */
.form-inputs-list :deep(.list-input) {
  margin-bottom: 0;
}

.form-inputs-list :deep(.item-input input),
.form-inputs-list :deep(.item-input select),
.form-inputs-list :deep(.item-input textarea) {
  font-size: 16px;
}

.input-error {
  --f7-input-outline-border-color: var(--f7-color-red) !important;
}

/* Enhanced error message styling with forced visibility */
.input-error-message {
  color: var(--f7-color-red) !important;
  font-size: 13px;
  margin-top: 6px;
  font-weight: 500;
  display: block !important;
  visibility: visible !important;
  min-height: 18px;
  line-height: 1.4;
  opacity: 1 !important;
  position: relative !important;
  z-index: 10;
}

.input-info-message {
  color: var(--f7-text-color-secondary);
  font-size: 13px;
  margin-top: 6px;
  line-height: 1.4;
}

/* Photo container improvements */
.photo-container {
  margin-bottom: 16px;
}

.photo-preview-container {
  width: 100%;
  position: relative;
  background-color: #f8f9fa;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
  border: 2px dashed #dee2e6;
  transition: border-color 0.2s;
}

.photo-preview-container:hover {
  border-color: #adb5bd;
}

.photo-preview-container:before {
  content: '';
  display: block;
  padding-top: 56.25%;
  /* 16:9 Aspect Ratio */
}

.photo-preview {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: opacity 0.2s;
}

.photo-preview:hover {
  opacity: 0.9;
}

.photo-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  cursor: pointer;
  transition: color 0.2s;
}

.photo-placeholder:hover {
  color: #495057;
}

.photo-placeholder span {
  font-size: 14px;
  margin-top: 12px;
  font-weight: 500;
}

.photo-button {
  margin: 0;
}

/* Geotag container improvements */
.geotag-container {
  margin-bottom: 16px;
}

.geotag-button {
  margin-top: 16px;
}

/* Navigation buttons container */
.form-nav-container {
  padding: 16px;
  margin-top: 24px;
}

.form-nav-buttons {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.nav-button {
  min-width: 120px;
  flex: 1;
}

.prev-button {
  max-width: 140px;
}

.next-button {
  max-width: 140px;
}

/* Spacer to prevent content from hiding behind the FAB */
.fab-safe-area {
  height: 100px;
}

/* Deep selector to override default Framework7 list item padding inside our form */
.form-inputs-list :deep(.item-content) {
  padding-left: 0;
  padding-right: 0;
}

.form-inputs-list :deep(.item-inner) {
  padding-top: 8px;
  padding-bottom: 8px;
}

/* Improve list styling */
.form-inputs-list :deep(.list) {
  margin: 0;
}

.form-inputs-list :deep(.list ul) {
  background: none;
}

.form-inputs-list :deep(.list ul:before),
.form-inputs-list :deep(.list ul:after) {
  display: none;
}

/* Button icon spacing */
.margin-right-half {
  margin-right: 4px;
}

.margin-left-half {
  margin-left: 4px;
}
</style>