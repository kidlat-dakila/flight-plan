import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "@/app.module"
import { PORT } from "@/settings"

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix("api", { exclude: ["health"] })
  await app.listen(PORT)
}

void bootstrap()
