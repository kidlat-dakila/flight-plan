import { TRPCError } from "@trpc/server"
import { searchCreationTargets } from "@/procedures/search-creation-targets"
import {
  searchCreationTargetsInputSchema,
  targetSuggestionsSchema,
} from "@/procedures/search-creation-targets/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_REPOSITORY_MESSAGE = "This repository is no longer listed."

export const searchCreationTargetsRoute = publicProcedure
  .input(searchCreationTargetsInputSchema)
  .output(targetSuggestionsSchema)
  .query(async ({ ctx, input }) => {
    const suggestions = await searchCreationTargets(input, ctx)
    if (suggestions === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_REPOSITORY_MESSAGE })
    return suggestions
  })
