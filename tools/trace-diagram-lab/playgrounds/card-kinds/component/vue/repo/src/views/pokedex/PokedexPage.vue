<script setup lang="ts">
import { usePokedex } from "@/composables/use-pokedex"
import { formatNumber } from "@/lib/format"

const pokedex = usePokedex()
</script>

<template>
  <ul>
    <li v-for="pokemon in pokedex" :key="pokemon.id">{{ formatNumber(pokemon.id) }} {{ pokemon.name }}</li>
  </ul>
</template>
