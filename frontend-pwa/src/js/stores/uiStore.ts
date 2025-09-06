import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  const shouldTriggerAssignmentListSync = ref(false);

  function setShouldTriggerAssignmentListSync(value: boolean) {
    shouldTriggerAssignmentListSync.value = value;
  }

  return {
    shouldTriggerAssignmentListSync,
    setShouldTriggerAssignmentListSync,
  };
});
