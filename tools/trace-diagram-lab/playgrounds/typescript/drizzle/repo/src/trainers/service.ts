import { findTrainers } from "@/db/queries/trainers"

export async function listTrainerNames(): Promise<string[]> {
  const trainers = await findTrainers()
  return trainers.map((trainer) => trainer.name)
}
