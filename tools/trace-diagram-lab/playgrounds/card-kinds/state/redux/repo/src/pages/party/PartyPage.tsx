import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useGetSuggestionsQuery, useSavePartyMutation } from "@/api/pokemon-api"
import type { AppDispatch } from "@/store"
import { loadParty, partySlice, selectMembers, selectOpenSlots } from "@/store/party-slice"

export function PartyPage() {
  const members = useSelector(selectMembers)
  const openSlots = useSelector(selectOpenSlots)
  const dispatch = useDispatch<AppDispatch>()
  const { data: suggestions = [] } = useGetSuggestionsQuery()
  const [saveParty] = useSavePartyMutation()

  useEffect(() => {
    dispatch(loadParty())
  }, [dispatch])

  return (
    <section>
      <h1>{openSlots} open slots</h1>
      <ul>
        {members.map((pokemon) => (
          <li key={pokemon.id}>
            {pokemon.name}
            <button type="button" onClick={() => dispatch(partySlice.actions.removeMember(pokemon.id))}>
              Release
            </button>
          </li>
        ))}
      </ul>
      <ul>
        {suggestions.map((pokemon) => (
          <li key={pokemon.id}>
            <button type="button" onClick={() => dispatch(partySlice.actions.addMember(pokemon))}>
              Add {pokemon.name}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => saveParty(members.map((pokemon) => pokemon.id))}>
        Save the party
      </button>
    </section>
  )
}
