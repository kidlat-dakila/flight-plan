import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type { Pokemon } from "@/types/pokemon"

export const pokemonApi = createApi({
  reducerPath: "pokemonApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  endpoints: (builder) => ({
    getSuggestions: builder.query<Pokemon[], void>({
      query: () => "/pokemon/suggestions",
    }),
    saveParty: builder.mutation<void, number[]>({
      query: (memberIds) => ({ url: "/party", method: "PUT", body: memberIds }),
    }),
  }),
})

export const { useGetSuggestionsQuery, useSavePartyMutation } = pokemonApi
