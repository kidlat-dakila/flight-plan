import { Injectable, NotFoundException } from "@nestjs/common"
import type { Pokemon } from "@/trainers/pokemon.model"
import { orderTeam, withBadge } from "@/trainers/rules"
import type { Trainer } from "@/trainers/trainer.model"

@Injectable()
export class TrainersService {
  private readonly trainers = new Map<number, Trainer>([
    [1, { id: 1, name: "Ash", hometown: "Pallet Town", badges: [] }],
    [2, { id: 2, name: "Misty", hometown: "Cerulean City", badges: ["Cascade Badge"] }],
  ])

  private readonly teams = new Map<number, Pokemon[]>([
    [1, [{ name: "Pikachu", level: 25 }, { name: "Charizard", level: 36 }]],
    [2, [{ name: "Starmie", level: 30 }]],
  ])

  list(): Trainer[] {
    return [...this.trainers.values()]
  }

  awardBadge(trainerId: number, badge: string): Trainer {
    const trainer = this.trainers.get(trainerId)
    if (trainer === undefined) throw new NotFoundException(`trainer ${trainerId} not found`)
    const awarded = withBadge(trainer, badge)
    this.trainers.set(trainerId, awarded)
    return awarded
  }

  teamOf(trainerId: number): Pokemon[] {
    return orderTeam(this.teams.get(trainerId) ?? [])
  }
}
