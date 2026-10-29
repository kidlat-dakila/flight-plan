import { request } from "@/api/client"
import type { Pokemon } from "@/types/pokemon"

export function fetchPokedex(): Promise<Pokemon[]> {
  return request<Pokemon[]>("/pokedex")
}
