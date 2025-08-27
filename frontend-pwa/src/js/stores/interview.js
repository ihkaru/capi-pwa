import { defineStore } from 'pinia';

export const useInterviewStore = defineStore('interview', {
  state: () => ({
    interviews: [],
  }),
  actions: {
    setInterviews(interviews) {
      this.interviews = interviews;
    },
  },
});
