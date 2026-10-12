import { TRPCError } from "@trpc/server"
import { deleteReview } from "@/procedures/delete-review"
import { deleteReviewInputSchema, deleteReviewResultSchema } from "@/procedures/delete-review/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const deleteReviewRoute = publicProcedure
  .input(deleteReviewInputSchema)
  .output(deleteReviewResultSchema)
  .mutation(async ({ ctx, input }) => {
    const result = await deleteReview(input, ctx)
    if (result === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "This review target has no review artifact to delete." })
    }
    return result
  })
