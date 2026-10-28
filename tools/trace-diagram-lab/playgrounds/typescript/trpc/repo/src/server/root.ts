import { pokemonRouter } from "~/server/routers/pokemon"
import { trainerRouter } from "~/server/routers/trainer"
import { createTRPCRouter } from "~/server/trpc"

export const appRouter = createTRPCRouter({
  pokemon: pokemonRouter,
  trainer: trainerRouter,
})

export type AppRouter = typeof appRouter
