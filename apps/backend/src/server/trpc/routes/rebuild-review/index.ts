import { TRPCError } from "@trpc/server"
import { rebuildReview } from "@/procedures/rebuild-review"
import { rebuildReviewInputSchema, rebuildReviewResultSchema } from "@/procedures/rebuild-review/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const rebuildReviewRoute = publicProcedure
  .input(rebuildReviewInputSchema)
  .output(rebuildReviewResultSchema)
  .mutation(async ({ ctx, input }) => {
    const result = await rebuildReview(input, ctx)
    if (result === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "This review target has no review artifact to build again." })
    }
    return result
  })
