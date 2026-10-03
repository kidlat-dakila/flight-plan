import { searchAdditionAuthors } from "@/procedures/search-addition-authors"
import { searchAdditionAuthorsInputSchema } from "@/procedures/search-addition-authors/utils/schemas"
import { authorSuggestionsSchema } from "@/procedures/search-repository-authors/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const searchAdditionAuthorsRoute = publicProcedure
  .input(searchAdditionAuthorsInputSchema)
  .output(authorSuggestionsSchema)
  .query(async ({ ctx, input }) => await searchAdditionAuthors(input, ctx))
