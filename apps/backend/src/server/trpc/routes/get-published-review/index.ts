import { TRPCError } from "@trpc/server"
import { getPublishedReview } from "@/procedures/get-published-review"
import { getPublishedReviewInputSchema, publishedReviewSchema } from "@/procedures/get-published-review/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getPublishedReviewRoute = publicProcedure
  .input(getPublishedReviewInputSchema)
  .output(publishedReviewSchema)
  .query(async ({ ctx, input }) => {
    const review = await getPublishedReview(input, ctx)
    if (review === null) throw new TRPCError({ code: "NOT_FOUND", message: "This review target has no Flight Plan to publish." })
    return review
  })
