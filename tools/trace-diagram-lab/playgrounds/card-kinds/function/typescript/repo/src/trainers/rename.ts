import { loadTrainers, saveTrainer } from "./store"
import type { Trainer } from "./trainer"

export function renameTrainer(id: number, name: string): Trainer {
  const trainer = loadTrainers().find((stored) => stored.id === id)
  const renamed = { ...trainer, id, name }
  saveTrainer(renamed)
  return renamed
}
