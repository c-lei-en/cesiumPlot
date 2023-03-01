import { defineStore } from "pinia";

export const useStore = defineStore("jsonData", {
  state: () => ({
    jsonData: {
      markerData: [],
      arcData: [],
      attackArrowData: [],
      pincerArrowData: [],
    },
    drawArr: [],
  }),
  getters: {},
  actions: {},
});
