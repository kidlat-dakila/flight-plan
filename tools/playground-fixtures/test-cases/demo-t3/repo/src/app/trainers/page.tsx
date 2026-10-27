import { api } from "~/trpc/server"

export default async function TrainersPage() {
  const trainers = await api.trainer.list()
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">Trainers</h1>
      <ul className="flex flex-col gap-2">
        {trainers.map((trainer) => (
          <li key={trainer.id}>
            {trainer.name} from {trainer.hometown}
          </li>
        ))}
      </ul>
    </main>
  )
}
