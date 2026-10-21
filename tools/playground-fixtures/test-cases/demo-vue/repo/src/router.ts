import { createRouter, createWebHistory } from "vue-router"
import HelpPage from "@/views/help/HelpPage.vue"
import ItemsPage from "@/views/items/ItemsPage.vue"
import RootLayout from "@/views/RootLayout.vue"
import TrainersPage from "@/views/trainers/TrainersPage.vue"

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: RootLayout,
      children: [
        { path: "", component: TrainersPage },
        { path: "items", component: ItemsPage },
        { path: "help", component: HelpPage },
      ],
    },
  ],
})
