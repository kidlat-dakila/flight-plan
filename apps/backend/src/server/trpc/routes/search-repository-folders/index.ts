import { searchRepositoryFolders } from "@/procedures/search-repository-folders"
import {
  folderSuggestionsSchema,
  searchRepositoryFoldersInputSchema,
} from "@/procedures/search-repository-folders/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const searchRepositoryFoldersRoute = publicProcedure
  .input(searchRepositoryFoldersInputSchema)
  .output(folderSuggestionsSchema)
  .query(async ({ ctx, input }) => searchRepositoryFolders(input, ctx))
