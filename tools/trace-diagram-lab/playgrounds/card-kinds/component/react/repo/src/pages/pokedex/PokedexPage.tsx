import { usePokedex } from "@/hooks/use-pokedex"
import { formatNumber } from "@/lib/format"

export function PokedexPage() {
  const pokedex = usePokedex()
  return (
    <ul>
      {pokedex.map((pokemon) => (
        <li key={pokemon.id}>
          {formatNumber(pokemon.id)} {pokemon.name}
        </li>
      ))}
    </ul>
  )
}
