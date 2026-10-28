<script setup lang="ts">
import type { Trainer } from "@/types/trainer"

defineProps<{ trainer: Trainer }>()
</script>

<template>
  <tr>
    <td>{{ trainer.name }}</td>
    <td>{{ trainer.hometown }}</td>
  </tr>
</template>
