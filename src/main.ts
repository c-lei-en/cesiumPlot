import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";

import { components } from "@/plugins/elementPlus";

import "./assets/main.css";
import "element-plus/theme-chalk/dark/css-vars.css";

import "animate.css";

Object.defineProperty(globalThis, "CESIUM_BASE_URL", {
  value: import.meta.env.VITE_CESIUM_BASE_URL,
});

const app = createApp(App);

// 按需导入Element Plus组件
components.forEach((component) => {
  app.component(component.name, component);
});

app.use(createPinia());
app.use(router);

app.mount("#app");
