import { TRPCError } from "@trpc/server"
import { missingRepositoryMessage } from "@/procedures/add-repository/utils/plan-repository-addition"
import { getRepositoryConfiguration } from "@/procedures/get-repository-configuration"
import {
  getRepositoryConfigurationInputSchema,
  repositoryConfigurationSchema,
} from "@/procedures/get-repository-configuration/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getRepositoryConfigurationRoute = publicProcedure
  .input(getRepositoryConfigurationInputSchema)
  .output(repositoryConfigurationSchema)
  .query(async ({ ctx, input }) => {
    const configuration = await getRepositoryConfiguration(input, ctx)
    if (configuration === null) throw new TRPCError({ code: "NOT_FOUND", message: missingRepositoryMessage(input.name) })
    return configuration
  })
