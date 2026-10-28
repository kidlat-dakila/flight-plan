<script setup lang="ts">
import { ref } from "vue"
import { BaseButton } from "@/components/ui"
import HelpPage from "@/views/help/HelpPage.vue"
import ItemsPage from "@/views/items/ItemsPage.vue"
import TrainersPage from "@/views/trainers/TrainersPage.vue"

type PageName = "trainers" | "items" | "help"

const page = ref<PageName>("trainers")
</script>

<template>
  <header>
    <BaseButton variant="ghost" @click="page = 'trainers'">Trainers</BaseButton>
    <BaseButton variant="ghost" @click="page = 'items'">Items</BaseButton>
    <BaseButton variant="ghost" @click="page = 'help'">Help</BaseButton>
  </header>
  <main>
    <TrainersPage v-if="page === 'trainers'" />
    <ItemsPage v-else-if="page === 'items'" />
    <HelpPage v-else />
  </main>
</template>
