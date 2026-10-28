export interface Pokemon {
  readonly id: number
  readonly name: string
  readonly level: number
}

const party = new Map<number, Pokemon>([
  [1, { id: 1, name: "Pikachu", level: 12 }],
  [2, { id: 2, name: "Staryu", level: 9 }],
])

export const readParty = (): Pokemon[] => [...party.values()]

export const readPokemon = (id: number): Pokemon | undefined => party.get(id)

export const addPokemon = (name: string, level: number): Pokemon => {
  const pokemon = { id: party.size + 1, name, level }
  party.set(pokemon.id, pokemon)
  return pokemon
}

export const renamePokemon = (id: number, name: string): Pokemon | undefined => {
  const pokemon = party.get(id)
  if (pokemon === undefined) return undefined
  const renamed = { ...pokemon, name }
  party.set(id, renamed)
  return renamed
}
