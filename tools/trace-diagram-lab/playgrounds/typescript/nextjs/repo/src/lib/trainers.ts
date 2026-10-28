export interface Trainer {
  id: number
  name: string
  hometown: string
}

const TRAINERS: Trainer[] = [
  { id: 1, name: "Ash", hometown: "Pallet Town" },
  { id: 2, name: "Misty", hometown: "Cerulean City" },
]

export function listTrainers(): Trainer[] {
  return TRAINERS
}
