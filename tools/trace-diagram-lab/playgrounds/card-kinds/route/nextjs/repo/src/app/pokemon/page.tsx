import Link from "next/link"
import { listPokemon } from "@/lib/pokemon"

export default function PokemonPage() {
  const party = listPokemon()
  return (
    <main>
      <h1>Pokemon</h1>
      <Link href="/pokemon/new">New Pokemon</Link>
      <ul>
        {party.map((pokemon) => (
          <li key={pokemon.id}>
            {pokemon.name} Lv. {pokemon.level} {pokemon.primaryType}
          </li>
        ))}
      </ul>
    </main>
  )
}
