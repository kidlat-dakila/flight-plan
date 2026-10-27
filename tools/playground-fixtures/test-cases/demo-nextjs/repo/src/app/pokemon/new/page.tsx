import { createPokemon } from "@/app/pokemon/actions"
import { PokemonForm } from "@/app/pokemon/components/PokemonForm"
import { findTrainers } from "@/db/queries/trainers"

export default async function NewPokemonPage() {
  const trainers = await findTrainers()
  return (
    <main>
      <h1>New Pokemon</h1>
      <PokemonForm action={createPokemon} trainers={trainers} />
    </main>
  )
}
