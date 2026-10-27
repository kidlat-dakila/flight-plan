import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Trainer } from "@/trainers/trainer.entity"
import { TrainersController } from "@/trainers/trainers.controller"
import { TrainersService } from "@/trainers/trainers.service"

@Module({
  imports: [TypeOrmModule.forFeature([Trainer])],
  controllers: [TrainersController],
  providers: [TrainersService],
  exports: [TrainersService],
})
export class TrainersModule {}
