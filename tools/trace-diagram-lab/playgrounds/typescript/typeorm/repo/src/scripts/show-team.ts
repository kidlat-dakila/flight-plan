import { dataSource } from "@/data-source"
import { readTeam } from "@/trainers/team"

const showTeam = async (trainerId: number) => {
  await dataSource.initialize()
  const team = await readTeam(trainerId)
  console.table(team.map((pokemon) => ({ species: pokemon.species, level: pokemon.level })))
  await dataSource.destroy()
}

void showTeam(Number(process.argv[2]))
