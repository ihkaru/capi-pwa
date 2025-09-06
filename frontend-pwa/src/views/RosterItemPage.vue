<template>
  <f7-page @page:afterin="onPageAfterIn">
    <f7-navbar :title="`Edit ${rosterQuestion?.item_label || 'Item'}`" back-link="Kembali"></f7-navbar>

    <f7-list form v-if="rosterItem && rosterQuestion">
      <template v-for="question in rosterQuestion.questions" :key="question.id">
        <div class="form-group">
          <!-- Text, Textarea, Number Inputs -->
          <f7-list-input :data-question-id="question.id"
            v-if="question.type === 'text' || question.type === 'textarea' || question.type === 'number'"
            :label="question.label" :type="question.type" :placeholder="question.placeholder"
            :value="rosterItem[question.id]" @input="updateRosterValue(question.id, $event.target.value)"
            :error-message="getValidationMessage(question.id)"
            :error-message-force="!!getValidationMessage(question.id)" :disabled="isDisabled" />

          <!-- Select Input -->
          <f7-list-input :data-question-id="question.id" v-else-if="question.type === 'select'" :label="question.label"
            type="select" :placeholder="question.placeholder" :value="rosterItem[question.id]"
            @input="updateRosterValue(question.id, $event.target.value)"
            :error-message="getValidationMessage(question.id)"
            :error-message-force="!!getValidationMessage(question.id)" :disabled="isDisabled">
            <option value="" disabled>-- Pilih salah satu --</option>
            <option v-for="option in question.options" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </f7-list-input>

          <!-- Nested Roster -->
          <RosterList v-else-if="question.type === 'roster'" :rosterQuestion="question"
            :rosterData="rosterItem[question.id] || []" :assignmentId="props.assignmentId" :disabled="isDisabled" />
        </div>
      </template>
    </f7-list>

    <f7-block>
      <f7-button fill large @click="saveAndGoBack" :disabled="isDisabled">Simpan</f7-button>
    </f7-block>

  </f7-page>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue';
import { f7 } from 'framework7-vue';
import { useFormStore } from '@/js/stores/formStore';
import RosterList from '@/components/RosterList.vue';

const props = defineProps({
  assignmentId: String,
  rosterQuestionId: String,
  index: String,
  scrollTo: String,
  f7route: Object, // Add this prop
});

const isDisabled = computed(() => props.f7route?.query?.disabled === 'true');

const formStore = useFormStore();
const rosterItem = ref(null);
const rosterQuestion = ref(null);

function getValidationMessage(questionId) {
  const fullId = `${props.rosterQuestionId}.${props.index}.${questionId}`;
  const validation = formStore.validationMap.get(fullId);
  return validation ? validation.message : null;
}

function findQuestionInSchema(questions, questionId) {
  for (const q of questions) {
    if (q.id === questionId) return q;
    if (q.type === 'roster') {
      const found = findQuestionInSchema(q.questions, questionId);
      if (found) return found;
    }
  }
  return null;
}

onMounted(() => {
  if (formStore.state.status !== 'ready') {
    formStore.loadAssignmentFromLocalDB(props.assignmentId);
  }

  const allQuestions = formStore.pages.flatMap(p => p.questions);
  rosterQuestion.value = findQuestionInSchema(allQuestions, props.rosterQuestionId);

  const itemIndex = parseInt(props.index, 10);
  if (rosterQuestion.value) {
    rosterItem.value = formStore.responses[props.rosterQuestionId]?.[itemIndex] || {};
  }
});

async function onPageAfterIn() {
  if (props.scrollTo) {
    await nextTick();
    const el = document.querySelector(`[data-question-id="${props.scrollTo}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.querySelector('input, select, textarea')?.focus();
    }
  }
}

function updateRosterValue(questionId, value) {
  const fullQuestionId = `${props.rosterQuestionId}.${props.index}.${questionId}`;
  formStore.updateResponse(fullQuestionId, value);
}

function saveAndGoBack() {
  formStore.saveResponsesToLocalDB();
  f7.views.main.router.back();
}
</script>