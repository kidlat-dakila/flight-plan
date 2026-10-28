import { Query, Resolver } from "@nestjs/graphql"
import { Trainer } from "@/trainers/trainer.model"
import { TrainersService } from "@/trainers/trainers.service"

@Resolver(() => Trainer)
export class TrainersResolver {
  constructor(private readonly trainersService: TrainersService) {}

  @Query(() => [Trainer])
  trainers(): Trainer[] {
    return this.trainersService.list()
  }
}
