import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"

const pokemonInput = z.object({
  name: z.string().min(1),
  level: z.number().int().min(1).max(100),
  primaryType: z.string().min(1),
  trainerId: z.number().int().nullable(),
})

export const pokemonRouter = createTRPCRouter({
  byId: publicProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => {
    return ctx.db.pokemon.findUnique({ where: { id: input.id } })
  }),

  create: publicProcedure.input(pokemonInput).mutation(({ ctx, input }) => {
    return ctx.db.pokemon.create({ data: input })
  }),
})
