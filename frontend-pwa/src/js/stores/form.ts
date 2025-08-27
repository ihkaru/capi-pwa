
import { defineStore } from 'pinia';

export const useFormStore = defineStore('form', {
  state: () => ({
    schema: null,
  }),
  actions: {
    setSchema(schema) {
      this.schema = schema;
    },
  },
});
