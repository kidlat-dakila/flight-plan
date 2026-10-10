<script setup lang="ts">
import { provide, ref } from "vue"
import { RouterLink, RouterView } from "vue-router"
import CartBadge from "@/components/CartBadge.vue"
import ThemeToggle from "@/components/ThemeToggle.vue"
import { themeKey, type Theme } from "@/components/theme"

const theme = ref<Theme>("light")
const toggleTheme = () => {
  theme.value = theme.value === "light" ? "dark" : "light"
}

provide(themeKey, { theme, toggleTheme })
</script>

<template>
  <div :class="theme">
    <header>
      <RouterLink to="/">Catalogue</RouterLink>
      <RouterLink to="/cart">Cart</RouterLink>
      <RouterLink to="/account">Account</RouterLink>
      <CartBadge />
      <ThemeToggle />
    </header>
    <RouterView />
  </div>
</template>
