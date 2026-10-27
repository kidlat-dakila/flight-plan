import { searchBaseBranches } from "@/procedures/search-base-branches"
import { baseBranchSuggestionsSchema, searchBaseBranchesInputSchema } from "@/procedures/search-base-branches/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const searchBaseBranchesRoute = publicProcedure
  .input(searchBaseBranchesInputSchema)
  .output(baseBranchSuggestionsSchema)
  .query(async ({ ctx, input }) => await searchBaseBranches(input, ctx))
