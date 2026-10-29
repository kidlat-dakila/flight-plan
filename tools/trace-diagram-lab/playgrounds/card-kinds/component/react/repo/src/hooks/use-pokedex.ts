import { useEffect, useState } from "react"
import { fetchPokedex } from "@/api/pokedex"
import type { Pokemon } from "@/types/pokemon"

export function usePokedex() {
  const [pokedex, setPokedex] = useState<Pokemon[]>([])

  useEffect(() => {
    fetchPokedex().then(setPokedex)
  }, [])

  return pokedex
}
