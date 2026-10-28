<script setup lang="ts">
import { useTrainers } from "@/composables/use-trainers"
import TrainerRow from "@/views/trainers/components/TrainerRow.vue"

const { trainers, isPending } = useTrainers()
</script>

<template>
  <p v-if="isPending">Loading the trainers…</p>
  <table v-else>
    <tbody>
      <TrainerRow v-for="trainer in trainers" :key="trainer.id" :trainer="trainer" />
    </tbody>
  </table>
</template>
