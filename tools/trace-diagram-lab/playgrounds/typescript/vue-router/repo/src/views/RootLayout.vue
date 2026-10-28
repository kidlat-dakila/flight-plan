<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router"
</script>

<template>
  <div>
    <header>
      <RouterLink to="/">Trainers</RouterLink>
      <RouterLink to="/items">Items</RouterLink>
      <RouterLink to="/help">Help</RouterLink>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>
