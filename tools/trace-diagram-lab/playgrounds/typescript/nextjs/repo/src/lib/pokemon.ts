export interface Pokemon {
  id: number
  name: string
  level: number
  primaryType: string
}

export type NewPokemon = Omit<Pokemon, "id">

let party: Pokemon[] = [
  { id: 1, name: "Pikachu", level: 12, primaryType: "electric" },
  { id: 2, name: "Bulbasaur", level: 9, primaryType: "grass" },
]

export function listPokemon(): Pokemon[] {
  return party
}

export function addPokemon(fields: NewPokemon): Pokemon {
  const added = { id: party.length + 1, ...fields }
  party = [...party, added]
  return added
}
