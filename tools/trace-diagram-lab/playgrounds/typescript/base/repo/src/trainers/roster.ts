import { TEAM_SIZE } from "@/config"
import type { Pokemon, Trainer } from "./trainer"

export class TrainerRoster {
  private readonly trainersById: Map<number, Trainer>

  constructor(trainers: Trainer[]) {
    this.trainersById = new Map(trainers.map((trainer) => [trainer.id, trainer]))
  }

  findTrainer(id: number): Trainer | undefined {
    return this.trainersById.get(id)
  }

  teamOf(id: number): Pokemon[] {
    return this.findTrainer(id)?.team.slice(0, TEAM_SIZE) ?? []
  }
}
