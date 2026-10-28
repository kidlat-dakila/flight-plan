import { Module } from "@nestjs/common"
import { TrainersController } from "@/trainers/trainers.controller"
import { TrainersService } from "@/trainers/trainers.service"

@Module({
  controllers: [TrainersController],
  providers: [TrainersService],
})
export class TrainersModule {}
