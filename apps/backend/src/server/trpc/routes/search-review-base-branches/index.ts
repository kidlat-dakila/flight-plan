import { baseBranchSuggestionsSchema } from "@/procedures/search-base-branches/utils/schemas"
import { searchReviewBaseBranches } from "@/procedures/search-review-base-branches"
import { searchReviewBaseBranchesInputSchema } from "@/procedures/search-review-base-branches/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const searchReviewBaseBranchesRoute = publicProcedure
  .input(searchReviewBaseBranchesInputSchema)
  .output(baseBranchSuggestionsSchema)
  .query(async ({ ctx, input }) => await searchReviewBaseBranches(input, ctx))
