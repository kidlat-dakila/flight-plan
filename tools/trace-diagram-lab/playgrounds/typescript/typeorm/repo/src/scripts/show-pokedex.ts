import { dataSource } from "@/data-source"
import { countBySpecies } from "@/pokemon/pokedex"

const showPokedex = async () => {
  await dataSource.initialize()
  console.table(await countBySpecies())
  await dataSource.destroy()
}

void showPokedex()
