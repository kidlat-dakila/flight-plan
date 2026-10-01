import { listRepositories } from "@/procedures/list-repositories"
import { listRepositoriesInputSchema, repositoryIndexSchema } from "@/procedures/list-repositories/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const listRepositoriesRoute = publicProcedure
  .input(listRepositoriesInputSchema)
  .output(repositoryIndexSchema)
  .query(async ({ ctx, input }) => listRepositories(input, ctx))
