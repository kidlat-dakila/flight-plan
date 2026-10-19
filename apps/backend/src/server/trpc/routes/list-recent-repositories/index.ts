import { listRecentRepositories } from "@/procedures/list-recent-repositories"
import {
  listRecentRepositoriesInputSchema,
  recentRepositoriesSchema,
} from "@/procedures/list-recent-repositories/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const listRecentRepositoriesRoute = publicProcedure
  .input(listRecentRepositoriesInputSchema)
  .output(recentRepositoriesSchema)
  .query(async ({ ctx, input }) => listRecentRepositories(input, ctx))
