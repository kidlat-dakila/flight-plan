import { listConfigurations } from "@/procedures/list-configurations"
import { configurationListSchema } from "@/procedures/list-configurations/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const listConfigurationsRoute = publicProcedure
  .output(configurationListSchema)
  .query(async ({ ctx }) => listConfigurations(ctx))
