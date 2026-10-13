import { saveConfiguration } from "@/procedures/save-configuration"
import { configurationSavingSchema, saveConfigurationInputSchema } from "@/procedures/save-configuration/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const saveConfigurationRoute = publicProcedure
  .input(saveConfigurationInputSchema)
  .output(configurationSavingSchema)
  .mutation(async ({ ctx, input }) => saveConfiguration(input, ctx))
