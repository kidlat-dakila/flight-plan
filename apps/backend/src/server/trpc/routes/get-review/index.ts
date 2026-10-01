import { TRPCError } from "@trpc/server"
import { getReview } from "@/procedures/get-review"
import { getReviewInputSchema, reviewPageSchema } from "@/procedures/get-review/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getReviewRoute = publicProcedure
  .input(getReviewInputSchema)
  .output(reviewPageSchema)
  .query(async ({ ctx, input }) => {
    const page = await getReview(input, ctx)
    if (page === null) throw new TRPCError({ code: "NOT_FOUND", message: "This review target is not listed in Flight Plan." })
    return page
  })
