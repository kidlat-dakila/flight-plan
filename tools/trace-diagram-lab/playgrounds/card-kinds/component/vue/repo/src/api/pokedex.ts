import { request } from "@/api/client"
import type { Pokemon } from "@/types/pokemon"

export const fetchPokedex = (): Promise<Pokemon[]> => request<Pokemon[]>("/pokedex")
