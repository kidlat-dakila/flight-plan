"use server"

import { redirect } from "next/navigation"
import { insertPokemon } from "@/db/queries/pokemon"
import type { NewPokemon } from "@/db/schema"

const NO_TRAINER = ""

function readPokemonFields(formData: FormData): NewPokemon {
  const trainerId = String(formData.get("trainerId"))
  return {
    name: String(formData.get("name")),
    level: Number(formData.get("level")),
    primaryType: String(formData.get("primaryType")),
    trainerId: trainerId === NO_TRAINER ? null : Number(trainerId),
  }
}

export async function createPokemon(formData: FormData) {
  const inserted = await insertPokemon(readPokemonFields(formData))
  redirect(`/pokemon/${inserted.id}`)
}
