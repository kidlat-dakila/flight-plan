import { TRPCError } from "@trpc/server"
import { configureRepository } from "@/procedures/configure-repository"
import {
  configuredRepositorySchema,
  configureRepositoryInputSchema,
} from "@/procedures/configure-repository/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const configureRepositoryRoute = publicProcedure
  .input(configureRepositoryInputSchema)
  .output(configuredRepositorySchema)
  .mutation(async ({ ctx, input }) => {
    const configuring = await configureRepository(input, ctx)
    if (configuring.kind === "rejected") throw new TRPCError({ code: "BAD_REQUEST", message: configuring.message })
    return { name: input.repositoryName }
  })
