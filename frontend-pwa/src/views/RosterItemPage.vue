<template>
  <f7-page>
    <f7-navbar :title="rosterItemLabel" back-link="Kembali"></f7-navbar>

    <f7-list form class="no-hairlines form-inputs-list">
      <QuestionRenderer
        v-for="question in rosterDefinition.questions"
        :key="question.id"
        :question="question"
        :responses="rosterItemData"
        :disabled="isPageDisabled"
        :assignmentId="assignmentId"
        :validationErrors="formStore.validationMap"
        :getImageSrc="getImageSrc"
        :full-question-id="`${basePath}.${question.id}`"
        @update:response="handleUpdateResponse"
        @file-selected="handleFileSelected"
        @image-click="handleImageClick"
        @open-camera="openCamera"
        @capture-geotag="handleGeotagCapture"
        :ref="(el) => { if (el) questionRendererRefs[question.id] = el }"
      />
    </f7-list>

  </f7-page>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { f7 } from 'framework7-vue';
import { useFormStore } from '@/js/stores/formStore';
import { useAuthStore } from '@/js/stores/authStore';
import QuestionRenderer from '@/components/QuestionRenderer.vue';
import { Geolocation } from '@capacitor/geolocation';
import { activityDB } from '@/js/services/offline/ActivityDB';

const props = defineProps({ f7route: Object });

const formStore = useFormStore();
const authStore = useAuthStore();

const assignmentId = computed(() => props.f7route.params.assignmentId);
const rosterQuestionId = computed(() => props.f7route.params.rosterQuestionId);
const rosterItemIndex = computed(() => parseInt(props.f7route.params.index, 10));
const isPageDisabled = computed(() => props.f7route.query.disabled === 'true');
const basePath = computed(() => props.f7route.query.basePath || '');

const questionRendererRefs = ref({});
const localPreviewUrls = ref(new Map<string, string>());

const rosterDefinition = computed(() => {
  const findQuestion = (questions: any[], id: string): any => {
    for (const q of questions) {
      if (q.id === id) return q;
      if (q.type === 'roster') {
        const found = findQuestion(q.questions, id);
        if (found) return found;
      }
    }
    return null;
  };
  return findQuestion(formStore.pages.flatMap(p => p.questions), rosterQuestionId.value);
});

const rosterItemData = computed(() => {
  const roster = formStore.responses[rosterQuestionId.value];
  return roster && roster[rosterItemIndex.value] ? roster[rosterItemIndex.value] : {};
});

const rosterItemLabel = computed(() => {
  return rosterItemData.value?.nama_art || rosterItemData.value?.name || `Item #${rosterItemIndex.value + 1}`;
});

const getApiRoot = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  return apiUrl.replace('/api', '');
}

const getImageSrc = (value: any) => {
  if (!value) return '';
  if (typeof value === 'object' && value.previewUrl) return value.previewUrl;
  if (typeof value === 'string' && !value.startsWith('data:image')) return `${getApiRoot()}/storage/${value}`;
  if (typeof value === 'string') return value;
  return '';
};

function handleUpdateResponse({ questionId, value }) {
  const fullQuestionId = `${basePath.value}.${questionId}`;
  formStore.updateResponse(fullQuestionId, value);
}

async function handleFileSelected(fullQuestionId: string, event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || !target.files[0]) return;
  const file = target.files[0];
  const userId = authStore.user?.id;
  if (!userId) return;

  try {
    const localPhotoId = crypto.randomUUID();
    await activityDB.photoBlobs.add({ id: localPhotoId, user_id: userId, blob: file });
    const previewUrl = URL.createObjectURL(file);
    const simpleQuestionId = fullQuestionId.split('.').pop() || '';
    localPreviewUrls.value.set(simpleQuestionId, previewUrl);
    formStore.updateResponse(fullQuestionId, { localId: localPhotoId, previewUrl });
  } catch (error) {
    console.error('Gagal menyimpan foto secara lokal:', error);
    f7.dialog.alert('Gagal menyimpan foto secara lokal.');
  }
}

function handleImageClick(question) {
    const imageValue = rosterItemData.value[question.id];
    if (!imageValue) return;

    if (isPageDisabled.value || (typeof imageValue === 'string' && !imageValue.startsWith('data:image'))) {
        const photoBrowser = f7.photoBrowser.create({ photos: [{ url: getImageSrc(imageValue) }], type: 'standalone' });
        photoBrowser.open();
    } else {
        openCamera(question.id);
    }
}

function openCamera(questionId) {
    const rendererInstance = questionRendererRefs.value[questionId];
    if (rendererInstance) {
        rendererInstance.triggerFileInputClick();
    }
}

async function handleGeotagCapture(fullQuestionId: string) {
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
    formStore.updateResponse(fullQuestionId, location);
  } catch (error) {
    f7.dialog.close();
    console.error('Gagal mengambil geotag:', error);
  }
}

onUnmounted(() => {
  localPreviewUrls.value.forEach(url => URL.revokeObjectURL(url));
});

</script>

<style scoped>
.form-inputs-list {
  padding: 0 16px;
  margin-top: 8px;
}
</style>
