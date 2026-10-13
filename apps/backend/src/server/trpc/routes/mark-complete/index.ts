import { TRPCError } from "@trpc/server"
import { markComplete } from "@/procedures/mark-complete"
import { markCompleteInputSchema, markCompleteResultSchema } from "@/procedures/mark-complete/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const markCompleteRoute = publicProcedure
  .input(markCompleteInputSchema)
  .output(markCompleteResultSchema)
  .mutation(async ({ ctx, input }) => {
    const result = await markComplete(input, ctx)
    if (result === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "This review target has no review artifact to complete." })
    }
    return result
  })
