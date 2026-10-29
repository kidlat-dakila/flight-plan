export interface Pokemon {
  name: string
  level: number
}

export interface Trainer {
  id: number
  name: string
  team: Pokemon[]
}
