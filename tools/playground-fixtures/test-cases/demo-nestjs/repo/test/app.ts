import { INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { AppModule } from "@/app.module"

export const startApp = async (): Promise<INestApplication> => {
  const testing = await Test.createTestingModule({ imports: [AppModule] }).compile()
  const app = testing.createNestApplication()
  app.setGlobalPrefix("api", { exclude: ["health"] })
  return app.init()
}
