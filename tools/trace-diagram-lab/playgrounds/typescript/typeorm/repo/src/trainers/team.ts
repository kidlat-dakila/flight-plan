import { dataSource } from "@/data-source"
import { NotFoundError } from "@/errors"
import type { Pokemon } from "@/pokemon/pokemon.entity"
import { Trainer } from "@/trainers/trainer.entity"

const trainers = dataSource.getRepository(Trainer)

export const readTeam = async (trainerId: number): Promise<Pokemon[]> => {
  const trainer = await trainers.findOne({ where: { id: trainerId }, relations: { team: true } })
  if (trainer === null) throw new NotFoundError("trainer", trainerId)
  return trainer.team
}
