import { z } from "zod"
import { readParty, readPokemon } from "~/server/data/pokemon"
import { createTRPCRouter, publicProcedure } from "~/server/trpc"

export const pokemonRouter = createTRPCRouter({
  list: publicProcedure.query(() => readParty()),

  byId: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => readPokemon(input.id) ?? null),
})
