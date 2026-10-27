import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { NotFoundError } from "@/errors"
import { CreateTrainerDto } from "@/trainers/trainer.dto"
import { Trainer } from "@/trainers/trainer.entity"

@Injectable()
export class TrainersService {
  constructor(@InjectRepository(Trainer) private readonly trainers: Repository<Trainer>) {}

  list(): Promise<Trainer[]> {
    return this.trainers.find({ order: { name: "ASC" } })
  }

  async find(trainerId: number): Promise<Trainer> {
    const trainer = await this.trainers.findOneBy({ id: trainerId })
    if (trainer === null) throw new NotFoundError("trainer", trainerId)
    return trainer
  }

  create(draft: CreateTrainerDto): Promise<Trainer> {
    return this.trainers.save(this.trainers.create(draft))
  }
}
