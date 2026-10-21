<script setup lang="ts">
import { useTrainers } from "@/composables/use-trainers"
import TrainerRow from "@/views/trainers/components/TrainerRow.vue"

const { data: trainers, isPending, isError } = useTrainers()
</script>

<template>
  <p v-if="isPending">Loading the trainers…</p>
  <p v-else-if="isError">The trainers could not be loaded.</p>
  <table v-else>
    <tbody>
      <TrainerRow v-for="trainer in trainers" :key="trainer.id" :trainer="trainer" />
    </tbody>
  </table>
</template>
