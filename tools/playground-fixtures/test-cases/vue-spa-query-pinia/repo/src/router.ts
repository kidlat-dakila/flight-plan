import { createRouter, createWebHistory } from "vue-router"
import AccountPage from "@/views/account/AccountPage.vue"
import CartPage from "@/views/cart/CartPage.vue"
import CatalogPage from "@/views/catalog/CatalogPage.vue"

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: CatalogPage },
    { path: "/cart", component: CartPage },
    { path: "/account", component: AccountPage },
  ],
})
