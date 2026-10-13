import { configurationDeletionSchema, deleteConfiguration, deleteConfigurationInputSchema } from "@/procedures/delete-configuration"
import { publicProcedure } from "@/server/trpc/trpc"

export const deleteConfigurationRoute = publicProcedure
  .input(deleteConfigurationInputSchema)
  .output(configurationDeletionSchema)
  .mutation(async ({ ctx, input }) => deleteConfiguration(input, ctx))
