import { TRPCError } from "@trpc/server"
import { searchRepositoryAuthors } from "@/procedures/search-repository-authors"
import {
  authorSuggestionsSchema,
  searchRepositoryAuthorsInputSchema,
} from "@/procedures/search-repository-authors/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_REPOSITORY_MESSAGE = "This repository is no longer in the setup."

export const searchRepositoryAuthorsRoute = publicProcedure
  .input(searchRepositoryAuthorsInputSchema)
  .output(authorSuggestionsSchema)
  .query(async ({ ctx, input }) => {
    const suggestions = await searchRepositoryAuthors(input, ctx)
    if (suggestions === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_REPOSITORY_MESSAGE })
    return suggestions
  })
