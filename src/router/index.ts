import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Neo4jEditor",
    component: () => import("../views/Neo4jEditor.vue")
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
