import "reflect-metadata"
import { DataSource } from "typeorm"
import { Pokemon } from "@/pokemon/pokemon.entity"
import { DATABASE_PATH } from "@/settings"
import { Trainer } from "@/trainers/trainer.entity"

export const dataSource = new DataSource({
  type: "sqlite",
  database: DATABASE_PATH,
  entities: [Trainer, Pokemon],
  synchronize: true,
})
