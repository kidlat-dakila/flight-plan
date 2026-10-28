import { readTrainers } from "~/server/data/trainers"
import { createTRPCRouter, publicProcedure } from "~/server/trpc"

export const trainerRouter = createTRPCRouter({
  list: publicProcedure.query(() => readTrainers()),
})
