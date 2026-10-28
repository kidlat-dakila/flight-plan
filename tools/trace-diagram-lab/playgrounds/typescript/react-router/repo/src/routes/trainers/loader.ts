import { fetchTrainers } from "@/api/trainers"

export async function trainersLoader() {
  return await fetchTrainers()
}
