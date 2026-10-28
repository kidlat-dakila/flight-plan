import type { Prisma } from "@prisma/client"
import { db } from "~/db"

export function findPartyOf(trainerId: number) {
  return db.pokemon.findMany({ where: { trainerId }, orderBy: { level: "desc" }, include: { trainer: true } })
}

export function createPokemon(data: Prisma.PokemonUncheckedCreateInput) {
  return db.pokemon.create({ data })
}
