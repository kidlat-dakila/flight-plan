import { HttpStatus, MiddlewareConsumer, Module, NestModule, ValidationPipe } from "@nestjs/common"
import { APP_FILTER, APP_PIPE } from "@nestjs/core"
import { TypeOrmModule } from "@nestjs/typeorm"
import { NotFoundFilter } from "@/errors"
import { HealthModule } from "@/health/health.module"
import { RequestLogMiddleware } from "@/middleware"
import { DATABASE_URL } from "@/settings"
import { TrainersModule } from "@/trainers/trainers.module"

@Module({
  imports: [
    TypeOrmModule.forRoot({ type: "sqlite", database: DATABASE_URL, autoLoadEntities: true, synchronize: true }),
    HealthModule,
    TrainersModule,
  ],
  providers: [
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }) },
    { provide: APP_FILTER, useClass: NotFoundFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLogMiddleware).forRoutes("*")
  }
}
