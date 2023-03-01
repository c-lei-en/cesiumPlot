import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("../views/home/index.vue"),
      children: [
        {
          path: "",
          name: "mapView",
          component: () => import("../views/map/index.vue"),
        },
      ],
    },
  ],
});

export default router;
