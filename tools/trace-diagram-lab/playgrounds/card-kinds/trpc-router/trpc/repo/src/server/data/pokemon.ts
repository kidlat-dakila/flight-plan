export interface Pokemon {
  id: number
  name: string
  level: number
  trainerName: string
}

let party: Pokemon[] = [
  { id: 1, name: "Pikachu", level: 12, trainerName: "Ash" },
  { id: 2, name: "Staryu", level: 9, trainerName: "Misty" },
]

export function readParty(): Pokemon[] {
  return party
}

export function readPokemon(id: number): Pokemon | undefined {
  return party.find((pokemon) => pokemon.id === id)
}
