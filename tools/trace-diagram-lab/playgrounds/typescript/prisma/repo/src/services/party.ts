import { createPokemon, findPartyOf } from "~/repositories/pokemon"

export async function catchPokemon(trainerId: number, name: string, primaryType: string) {
  return createPokemon({ name, primaryType, level: 1, trainerId })
}

export async function strongestOf(trainerId: number) {
  const [strongest] = await findPartyOf(trainerId)
  return strongest
}
