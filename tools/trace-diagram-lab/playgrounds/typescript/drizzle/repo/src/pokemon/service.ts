import { findPokemon, insertPokemon } from "@/db/queries/pokemon"
import type { NewPokemon, Pokemon } from "@/db/schema"

export async function catchPokemon(fields: NewPokemon): Promise<Pokemon> {
  return insertPokemon({ ...fields, level: Math.max(1, fields.level) })
}

export async function showPokemon(id: number): Promise<Pokemon | undefined> {
  return findPokemon(id)
}
