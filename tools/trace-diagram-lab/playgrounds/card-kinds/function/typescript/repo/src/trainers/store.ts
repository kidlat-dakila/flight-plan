import type { Trainer } from "./trainer"

const trainersById = new Map<number, Trainer>([
  [2, { id: 2, name: "Misty", hometown: "Cerulean City", badges: ["Cascade Badge"] }],
  [1, { id: 1, name: "Ash", hometown: "Pallet Town", badges: ["Boulder Badge", "Cascade Badge"] }],
])

export function loadTrainers(): Trainer[] {
  return [...trainersById.values()]
}

export function saveTrainer(trainer: Trainer): void {
  trainersById.set(trainer.id, trainer)
}
