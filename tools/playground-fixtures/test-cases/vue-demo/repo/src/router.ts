import { createRouter, createWebHistory } from "vue-router"
import CustomersPage from "@/views/customers/CustomersPage.vue"
import HelpPage from "@/views/help/HelpPage.vue"
import ProductsPage from "@/views/products/ProductsPage.vue"
import RootLayout from "@/views/RootLayout.vue"

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: RootLayout,
      children: [
        { path: "", component: CustomersPage },
        { path: "products", component: ProductsPage },
        { path: "help", component: HelpPage },
      ],
    },
  ],
})
