export interface Pokemon {
  name: string
  level: number
}

export interface Trainer {
  id: number
  name: string
  hometown: string
  team: Pokemon[]
}
