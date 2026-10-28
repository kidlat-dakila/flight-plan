export interface Trainer {
  name: string
  hometown: string
}

const TRAINERS: Trainer[] = [
  { name: "Ash", hometown: "Pallet Town" },
  { name: "Misty", hometown: "Cerulean City" },
]

export function readTrainers(): Trainer[] {
  return TRAINERS
}
