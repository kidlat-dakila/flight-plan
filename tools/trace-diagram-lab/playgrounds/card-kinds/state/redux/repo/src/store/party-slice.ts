import { createAsyncThunk, createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { listenerMiddleware } from "@/store/listener"
import type { Pokemon } from "@/types/pokemon"

interface PartyRoot {
  party: { members: Pokemon[] }
}

const PARTY_LIMIT = 6

export const loadParty = createAsyncThunk("party/load", async () => {
  const response = await fetch("/api/party")
  return (await response.json()) as Pokemon[]
})

export const partySlice = createSlice({
  name: "party",
  initialState: { members: [] as Pokemon[] },
  reducers: {
    addMember(state, action: PayloadAction<Pokemon>) {
      if (state.members.length < PARTY_LIMIT) state.members.push(action.payload)
    },
    removeMember: (state, action: PayloadAction<number>) => {
      state.members = state.members.filter((pokemon) => pokemon.id !== action.payload)
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadParty.fulfilled, (state, action) => {
      state.members = action.payload
    })
  },
})

listenerMiddleware.startListening({
  actionCreator: partySlice.actions.removeMember,
  effect: (action) => {
    localStorage.setItem("party.last-released", String(action.payload))
  },
})

export const selectMembers = (state: PartyRoot) => state.party.members
export const selectOpenSlots = createSelector([selectMembers], (members) => PARTY_LIMIT - members.length)
