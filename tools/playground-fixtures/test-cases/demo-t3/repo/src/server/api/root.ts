import { pokemonRouter } from "~/server/api/routers/pokemon"
import { trainerRouter } from "~/server/api/routers/trainer"
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc"

export const appRouter = createTRPCRouter({
  pokemon: pokemonRouter,
  trainer: trainerRouter,
})

export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)
