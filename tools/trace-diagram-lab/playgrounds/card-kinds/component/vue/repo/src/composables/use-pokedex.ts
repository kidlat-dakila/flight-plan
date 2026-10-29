import { onMounted, ref } from "vue"
import { fetchPokedex } from "@/api/pokedex"
import type { Pokemon } from "@/types/pokemon"

export const usePokedex = () => {
  const pokedex = ref<Pokemon[]>([])

  onMounted(async () => {
    pokedex.value = await fetchPokedex()
  })

  return pokedex
}
