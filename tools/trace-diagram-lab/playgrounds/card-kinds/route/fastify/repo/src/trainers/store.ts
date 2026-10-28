export interface Trainer {
  readonly name: string
  readonly hometown: string
}

const TRAINERS: Trainer[] = [
  { name: "Ash", hometown: "Pallet Town" },
  { name: "Misty", hometown: "Cerulean City" },
]

export const readTrainers = (): Trainer[] => TRAINERS
