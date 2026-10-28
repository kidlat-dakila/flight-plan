import { findTrainers } from "~/repositories/trainers"

export async function listHometowns(): Promise<string[]> {
  const trainers = await findTrainers()
  return [...new Set(trainers.map((trainer) => trainer.hometown))]
}
