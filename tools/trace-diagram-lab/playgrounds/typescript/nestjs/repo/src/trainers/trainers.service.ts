import { Injectable, NotFoundException } from "@nestjs/common"
import { CreateTrainerDto } from "@/trainers/trainer.dto"
import type { Trainer } from "@/trainers/trainer"

@Injectable()
export class TrainersService {
  private readonly trainers = new Map<number, Trainer>()
  private nextId = 1

  list(): Trainer[] {
    return [...this.trainers.values()].sort((left, right) => left.name.localeCompare(right.name))
  }

  find(trainerId: number): Trainer {
    const trainer = this.trainers.get(trainerId)
    if (trainer === undefined) throw new NotFoundException(`trainer ${trainerId} not found`)
    return trainer
  }

  create(draft: CreateTrainerDto): Trainer {
    const trainer: Trainer = { id: this.nextId++, name: draft.name, hometown: draft.hometown, badges: [] }
    this.trainers.set(trainer.id, trainer)
    return trainer
  }
}
