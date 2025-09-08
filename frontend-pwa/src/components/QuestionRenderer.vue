<template>
  <div class="form-group" :data-question-id="fullQuestionId"
    v-if="!question.conditionalLogic?.showIf || executeLogic(question.conditionalLogic.showIf, responses)">

    <!-- Text, Textarea, Number Inputs -->
    <template v-if="question.type === 'text' || question.type === 'textarea' || question.type === 'number'">
      <div class="form-label">
        {{ question.label }}
        <span v-if="isRequired" class="required-indicator">*</span>
      </div>
      <f7-list-input :inputStyle="{ 'margin-left': 0, 'margin-right': 0 }" :type="question.type"
        :placeholder="question.placeholder || 'Masukkan jawaban...'" :value="responses[question.id] || ''"
        @input="$emit('update:response', { questionId: question.id, value: $event.target.value })"
        @blur="formStore.touchField(fullQuestionId)" :disabled="disabled" :class="{ 'input-error': hasError }"
        :error-message="validationError?.message" :error-message-force="hasError" />
      <!-- The manual error div is no longer needed -->
      <div v-if="question.info" class="input-info-message">{{ question.info }}</div>
    </template>

    <!-- Select Input -->
    <template v-else-if="question.type === 'select'">
      <div class="form-label">
        {{ question.label }}
        <span v-if="isRequired" class="required-indicator">*</span>
      </div>
      <f7-list-input outline type="select" :placeholder="question.placeholder || 'Pilih salah satu...'"
        :value="responses[question.id] || ''"
        @change="$emit('update:response', { questionId: question.id, value: $event.target.value })"
        @blur="formStore.touchField(fullQuestionId)" :disabled="disabled" :class="{ 'input-error': hasError }"
        :error-message="validationError?.message" :error-message-force="hasError">
        <option value="" disabled>-- Pilih salah satu --</option>
        <option v-for="option in question.options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </f7-list-input>
      <!-- The manual error div is no longer needed -->
      <div v-if="question.info" class="input-info-message">{{ question.info }}</div>
    </template>

    <!-- Image Input -->
    <template v-else-if="question.type === 'image'">
      <div class="form-label">
        {{ question.label }}
        <span v-if="isRequired" class="required-indicator">*</span>
      </div>
      <input type="file" accept="image/*" capture="environment" style="display: none;" :ref="(el) => (imageInput = el)"
        @change="(event) => $emit('file-selected', fullQuestionId, event)" />
      <div class="photo-container">
        <div class="photo-preview-container">
          <img v-if="responses[question.id]" :src="getImageSrc(responses[question.id])" class="photo-preview"
            @click="$emit('image-click', question)" />
          <div v-else class="photo-placeholder" @click="!disabled && $emit('open-camera', question.id)">
            <f7-icon f7="camera" size="48px" color="#999"></f7-icon>
            <span>Ketuk untuk mengambil foto</span>
          </div>
        </div>
        <f7-button large fill @click="$emit('open-camera', question.id)" class="photo-button" :disabled="disabled">
          <f7-icon f7="camera_fill" class="margin-right-half"></f7-icon>
          {{ responses[question.id] ? 'Ambil Ulang Foto' : 'Ambil Foto' }}
        </f7-button>
      </div>
      <!-- FIX for image/geotag: Use the manual div since f7-list-input is not the main component -->
      <div v-if="hasError" class="input-error-message standalone-error-message">
        {{ validationError.message }}
      </div>
      <div v-if="question.info" class="input-info-message">{{ question.info }}</div>
    </template>

    <!-- Geotag Input -->
    <template v-else-if="question.type === 'geotag'">
      <div class="form-label">
        {{ question.label }}
        <span v-if="isRequired" class="required-indicator">*</span>
      </div>
      <div class="geotag-container">
        <GeotagPreview :location="responses[question.id] || null" />
        <f7-button large fill @click="$emit('capture-geotag', fullQuestionId)" class="geotag-button"
          :disabled="disabled">
          <f7-icon f7="placemark_fill" class="margin-right-half"></f7-icon>
          {{ responses[question.id] ? 'Ambil Ulang Lokasi' : 'Ambil Lokasi' }}
        </f7-button>
      </div>
      <!-- FIX for image/geotag: Use the manual div -->
      <div v-if="hasError" class="input-error-message standalone-error-message">
        {{ validationError.message }}
      </div>
      <div v-if="question.info" class="input-info-message">{{ question.info }}</div>
    </template>

    <!-- Roster Input -->
    <template v-else-if="question.type === 'roster'">
      <RosterList :rosterQuestion="question" :rosterData="responses[question.id] || []" :assignmentId="assignmentId"
        :disabled="disabled" :validationErrors="validationErrors" :basePath="fullQuestionId" />
    </template>

  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed, ref } from 'vue';
import { useFormStore } from '@/js/stores/formStore';
import { executeLogic } from '@/js/services/logicEngine';
import RosterList from '@/components/RosterList.vue';
import GeotagPreview from '@/components/GeotagPreview.vue';

const props = defineProps({
  question: { type: Object, required: true },
  responses: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  assignmentId: { type: String, required: true },
  validationErrors: { type: Map, required: true },
  getImageSrc: { type: Function, required: true },
  fullQuestionId: { type: String, required: true },
});

defineEmits([
  'update:response',
  'file-selected',
  'image-click',
  'open-camera',
  'capture-geotag',
]);

const formStore = useFormStore();
const imageInput = ref<HTMLInputElement | null>(null);

const isRequired = computed(() => {
  if (props.question.validation?.required) return true;
  if (props.question.validation?.requiredIf) {
    return executeLogic(props.question.validation.requiredIf, props.responses);
  }
  return false;
});

const validationError = computed(() => {
  return props.validationErrors.get(props.fullQuestionId);
});

const hasError = computed(() => {
  const error = validationError.value;
  if (error) {
    console.log(`[CAPI-LOG] QuestionRenderer (${props.fullQuestionId}): hasError is TRUE. Error:`, error);
  }
  return !!error;
});

function triggerFileInputClick() {
  if (imageInput.value) {
    imageInput.value.click();
  }
}

defineExpose({
  triggerFileInputClick,
});

</script>

<style scoped>
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

/* This is now only for image/geotag or custom components */
.input-error-message.standalone-error-message {
  color: var(--f7-color-red);
  font-size: 13px;
  margin-top: 6px;
  font-weight: 500;
}

.input-info-message {
  color: var(--f7-text-color-secondary);
  font-size: 13px;
  margin-top: 6px;
  line-height: 1.4;
}

.photo-container,
.geotag-container {
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
}

.photo-placeholder span {
  font-size: 14px;
  margin-top: 12px;
  font-weight: 500;
}

.photo-button,
.geotag-button {
  margin: 0;
  margin-top: 16px;
}

.margin-right-half {
  margin-right: 4px;
}
</style>