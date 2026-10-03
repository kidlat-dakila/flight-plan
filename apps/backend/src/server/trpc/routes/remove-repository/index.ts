import { TRPCError } from "@trpc/server"
import { missingRepositoryMessage } from "@/procedures/add-repository/utils/plan-repository-addition"
import { removeRepository } from "@/procedures/remove-repository"
import { removedRepositorySchema, removeRepositoryInputSchema } from "@/procedures/remove-repository/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const removeRepositoryRoute = publicProcedure
  .input(removeRepositoryInputSchema)
  .output(removedRepositorySchema)
  .mutation(async ({ ctx, input }) => {
    const removed = await removeRepository(input, ctx)
    if (removed === null) throw new TRPCError({ code: "NOT_FOUND", message: missingRepositoryMessage(input.name) })
    return removed
  })
