<script setup lang="ts">
import { ITEMS } from "@/data/items"
</script>

<template>
  <ul>
    <li v-for="item in ITEMS" :key="item.id">{{ item.name }} ₽{{ item.price }}</li>
  </ul>
</template>
