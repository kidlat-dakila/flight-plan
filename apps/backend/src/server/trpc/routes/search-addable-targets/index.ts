import { TRPCError } from "@trpc/server"
import { searchAddableTargets } from "@/procedures/search-addable-targets"
import { searchAddableTargetsInputSchema } from "@/procedures/search-addable-targets/utils/schemas"
import { targetSuggestionsSchema } from "@/procedures/search-creation-targets/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_REPOSITORY_MESSAGE = "This repository is no longer listed."

export const searchAddableTargetsRoute = publicProcedure
  .input(searchAddableTargetsInputSchema)
  .output(targetSuggestionsSchema)
  .query(async ({ ctx, input }) => {
    const suggestions = await searchAddableTargets(input, ctx)
    if (suggestions === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_REPOSITORY_MESSAGE })
    return suggestions
  })
