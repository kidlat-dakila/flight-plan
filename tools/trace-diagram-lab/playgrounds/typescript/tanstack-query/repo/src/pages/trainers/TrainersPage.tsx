import { useTrainers } from "@/hooks/use-trainers"
import { TrainerRow } from "./components/TrainerRow"

export function TrainersPage() {
  const { data: trainers, isPending, isError } = useTrainers()
  if (isPending) return <p>Loading the trainers…</p>
  if (isError) return <p>The trainers could not be loaded.</p>
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
