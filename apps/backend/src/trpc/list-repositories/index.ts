import { publicProcedure } from "@/trpc/procedures"
import { buildRepositoryIndex } from "./utils/build-repository-index"
import { listRepositoriesInputSchema, repositoryIndexSchema } from "./utils/schemas"

export const listRepositoriesProcedure = publicProcedure
  .input(listRepositoriesInputSchema)
  .output(repositoryIndexSchema)
  .query(async ({ ctx, input }) =>
    buildRepositoryIndex(await ctx.repositoryStore.list(), ctx.now(), ctx.dataNotice, input))
