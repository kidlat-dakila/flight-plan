import { PokemonForm } from "~/app/pokemon/_components/PokemonForm"
import { api } from "~/trpc/server"

export default async function NewPokemonPage() {
  const trainers = await api.trainer.list()
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">New Pokemon</h1>
      <PokemonForm trainers={trainers} />
    </main>
  )
}
