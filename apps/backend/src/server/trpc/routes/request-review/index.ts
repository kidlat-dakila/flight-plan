import { TRPCError } from "@trpc/server"
import { requestReview } from "@/procedures/request-review"
import { requestReviewInputSchema, requestReviewResultSchema } from "@/procedures/request-review/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const requestReviewRoute = publicProcedure
  .input(requestReviewInputSchema)
  .output(requestReviewResultSchema)
  .mutation(async ({ ctx, input }) => {
    const result = await requestReview(input, ctx)
    if (result === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "A review cannot be requested for this review target." })
    }
    return result
  })
