import { api } from "~/client/api"

export function PartyList() {
  const party = api.pokemon.list.useQuery()
  if (party.data === undefined) return <p>Loading…</p>
  return (
    <ul>
      {party.data.map((pokemon) => (
        <li key={pokemon.id}>
          {pokemon.name} Lv. {pokemon.level}
        </li>
      ))}
    </ul>
  )
}
