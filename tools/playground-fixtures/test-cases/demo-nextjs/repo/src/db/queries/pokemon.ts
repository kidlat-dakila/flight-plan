import { eq } from "drizzle-orm"
import { db } from "@/db"
import { pokemon, type NewPokemon, type Pokemon } from "@/db/schema"

export async function findPokemon(id: number): Promise<Pokemon | undefined> {
  const [found] = await db.select().from(pokemon).where(eq(pokemon.id, id))
  return found
}

export async function insertPokemon(fields: NewPokemon): Promise<Pokemon> {
  const [inserted] = await db.insert(pokemon).values(fields).returning()
  return inserted
}
