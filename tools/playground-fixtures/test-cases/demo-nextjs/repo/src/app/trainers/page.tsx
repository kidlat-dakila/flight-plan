import { findTrainers } from "@/db/queries/trainers"

export default async function TrainersPage() {
  const trainers = await findTrainers()
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
