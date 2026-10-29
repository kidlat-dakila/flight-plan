import { Module } from "@nestjs/common"
import { TrainersService } from "@/trainers/trainers.service"
import { TrainersResolver } from "@/trainers/trainers.resolver"

@Module({
  providers: [TrainersResolver, TrainersService],
})
export class TrainersModule {}
