import { useLoaderData } from "react-router"
import { TrainerRow } from "./components/TrainerRow"
import type { trainersLoader } from "./loader"

export function TrainersPage() {
  const trainers = useLoaderData<typeof trainersLoader>()
  return (
    <table>
      <tbody>
        {trainers.map((trainer) => (
          <TrainerRow key={trainer.id} trainer={trainer} />
        ))}
      </tbody>
    </table>
  )
}
