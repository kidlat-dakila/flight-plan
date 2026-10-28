"use server"

import { redirect } from "next/navigation"
import { addPokemon, type NewPokemon } from "@/lib/pokemon"

function readPokemonFields(formData: FormData): NewPokemon {
  return {
    name: String(formData.get("name")),
    level: Number(formData.get("level")),
    primaryType: String(formData.get("primaryType")),
  }
}

export async function createPokemon(formData: FormData) {
  addPokemon(readPokemonFields(formData))
  redirect("/pokemon")
}
