import { dataSource } from "@/data-source"
import { Pokemon } from "@/pokemon/pokemon.entity"

export const countBySpecies = async (): Promise<Record<string, number>> => {
  const rows = await dataSource
    .getRepository(Pokemon)
    .createQueryBuilder("pokemon")
    .select("pokemon.species", "species")
    .addSelect("COUNT(*)", "count")
    .groupBy("pokemon.species")
    .getRawMany<{ species: string; count: string }>()
  return Object.fromEntries(rows.map((row) => [row.species, Number(row.count)]))
}
