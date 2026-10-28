import type { Pokemon } from "@/trainers/pokemon.model"
import type { Trainer } from "@/trainers/trainer.model"

export function withBadge(trainer: Trainer, badge: string): Trainer {
  return { ...trainer, badges: [...trainer.badges, badge] }
}

export function orderTeam(team: Pokemon[]): Pokemon[] {
  return [...team]
}
