import { TRPCError } from "@trpc/server"
import { publicProcedure } from "@/trpc/procedures"
import { dismissNewTarget } from "./utils/dismiss-new-target"
import { dismissedNewTargetSchema, dismissNewTargetInputSchema } from "./utils/schemas"

export const dismissNewTargetProcedure = publicProcedure
  .input(dismissNewTargetInputSchema)
  .output(dismissedNewTargetSchema)
  .mutation(async ({ ctx, input }) => {
    const repository = dismissNewTarget(await ctx.repositoryStore.list(), input.repositoryName, input.targetId)
    if (repository === null) throw new TRPCError({ code: "NOT_FOUND", message: "This review target is no longer listed." })
    await ctx.repositoryStore.replace(repository)
    return { targetId: input.targetId }
  })
