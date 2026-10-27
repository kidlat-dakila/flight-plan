import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"

export const trainerRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) => {
    return ctx.db.trainer.findMany({ orderBy: { name: "asc" } })
  }),
})
