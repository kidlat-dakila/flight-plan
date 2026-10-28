import { useTrainers } from "@/hooks/use-trainers"
import { TrainerRow } from "./components/TrainerRow"

export function TrainersPage() {
  const { trainers, isLoading } = useTrainers()
  if (isLoading) return <p>Loading the trainers…</p>
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
