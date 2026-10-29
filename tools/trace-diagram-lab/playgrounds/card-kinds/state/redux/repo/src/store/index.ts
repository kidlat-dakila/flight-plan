import { configureStore } from "@reduxjs/toolkit"
import { pokemonApi } from "@/api/pokemon-api"
import { listenerMiddleware } from "@/store/listener"
import { partySlice } from "@/store/party-slice"

export const store = configureStore({
  reducer: {
    party: partySlice.reducer,
    [pokemonApi.reducerPath]: pokemonApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(listenerMiddleware.middleware).concat(pokemonApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
