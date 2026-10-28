import { HttpStatus, MiddlewareConsumer, Module, NestModule, ValidationPipe } from "@nestjs/common"
import { APP_PIPE } from "@nestjs/core"
import { HealthModule } from "@/health/health.module"
import { RequestLogMiddleware } from "@/middleware"
import { TrainersModule } from "@/trainers/trainers.module"

@Module({
  imports: [HealthModule, TrainersModule],
  providers: [
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }) },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLogMiddleware).forRoutes("*")
  }
}
