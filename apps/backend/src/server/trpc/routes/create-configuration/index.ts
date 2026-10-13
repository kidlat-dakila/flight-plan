import { createConfiguration } from "@/procedures/create-configuration"
import { configurationCreationSchema, createConfigurationInputSchema } from "@/procedures/create-configuration/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const createConfigurationRoute = publicProcedure
  .input(createConfigurationInputSchema)
  .output(configurationCreationSchema)
  .mutation(async ({ ctx, input }) => createConfiguration(input, ctx))
