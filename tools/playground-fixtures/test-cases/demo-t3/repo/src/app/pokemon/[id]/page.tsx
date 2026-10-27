import { notFound } from "next/navigation"
import { api } from "~/trpc/server"

export default async function PokemonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pokemon = await api.pokemon.byId({ id: Number(id) })
  if (pokemon === null) notFound()
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">{pokemon.name}</h1>
      <p className="text-slate-400">
        Lv. {pokemon.level} {pokemon.primaryType}
      </p>
    </main>
  )
}
