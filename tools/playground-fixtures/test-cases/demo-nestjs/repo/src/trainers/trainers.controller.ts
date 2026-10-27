import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common"
import { ApiKeyGuard } from "@/security"
import { CreateTrainerDto } from "@/trainers/trainer.dto"
import { TrainersService } from "@/trainers/trainers.service"

@Controller("trainers")
@UseGuards(ApiKeyGuard)
export class TrainersController {
  constructor(private readonly trainers: TrainersService) {}

  @Get()
  readAll() {
    return this.trainers.list()
  }

  @Get(":trainerId")
  read(@Param("trainerId", ParseIntPipe) trainerId: number) {
    return this.trainers.find(trainerId)
  }

  @Post()
  add(@Body() draft: CreateTrainerDto) {
    return this.trainers.create(draft)
  }
}
