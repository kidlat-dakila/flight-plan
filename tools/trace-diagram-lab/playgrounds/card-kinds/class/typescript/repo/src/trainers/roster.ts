import type { Trainer } from "./trainer"

const TRAINERS: Trainer[] = [
  { id: 1, name: "Ash", team: [{ name: "Pikachu", level: 25 }, { name: "Charizard", level: 36 }] },
  { id: 2, name: "Misty", team: [{ name: "Starmie", level: 30 }] },
]

export class TrainerRoster {
  private readonly trainersById = new Map(TRAINERS.map((trainer) => [trainer.id, trainer]))

  findTrainer(id: number): Trainer | undefined {
    return this.trainersById.get(id)
  }
}
