import { TRPCError } from "@trpc/server"
import { searchReviewers } from "@/procedures/search-reviewers"
import { reviewerOptionsSchema, searchReviewersInputSchema } from "@/procedures/search-reviewers/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const searchReviewersRoute = publicProcedure
  .input(searchReviewersInputSchema)
  .output(reviewerOptionsSchema)
  .query(async ({ ctx, input }) => {
    const options = await searchReviewers(input, ctx)
    if (options === null) throw new TRPCError({ code: "NOT_FOUND", message: "This pull request is no longer there." })
    return options
  })
