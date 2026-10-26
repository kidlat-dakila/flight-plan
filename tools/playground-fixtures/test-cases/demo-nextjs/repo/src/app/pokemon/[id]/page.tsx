import { notFound } from "next/navigation"
import { findPokemon } from "@/db/queries/pokemon"

export default async function PokemonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pokemon = await findPokemon(Number(id))
  if (pokemon === undefined) notFound()
  return (
    <main>
      <h1>{pokemon.name}</h1>
      <p>
        Lv. {pokemon.level} {pokemon.primaryType}
      </p>
    </main>
  )
}
