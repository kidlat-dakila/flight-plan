<script setup lang="ts">
import { inject } from "vue"
import { RouterLink, RouterView } from "vue-router"
import { sessionKey } from "@/components/session"
import { BaseButton } from "@/components/ui"

const session = inject(sessionKey)
</script>

<template>
  <div>
    <header>
      <RouterLink to="/">Customers</RouterLink>
      <RouterLink to="/products">Products</RouterLink>
      <RouterLink to="/help">Help</RouterLink>
      <span>{{ session?.staffName.value }}</span>
      <BaseButton variant="ghost" @click="session?.signOut()">Sign out</BaseButton>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>
