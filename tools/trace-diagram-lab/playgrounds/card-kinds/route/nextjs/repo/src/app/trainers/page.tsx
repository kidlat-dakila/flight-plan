import { listTrainers } from "@/lib/trainers"

export default function TrainersPage() {
  const trainers = listTrainers()
  return (
    <main>
      <h1>Trainers</h1>
      <ul>
        {trainers.map((trainer) => (
          <li key={trainer.id}>
            {trainer.name} from {trainer.hometown}
          </li>
        ))}
      </ul>
    </main>
  )
}
