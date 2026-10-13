import { configurationCreationFormSchema, getConfigurationCreationForm } from "@/procedures/get-configuration-creation-form"
import { publicProcedure } from "@/server/trpc/trpc"

export const getConfigurationCreationFormRoute = publicProcedure
  .output(configurationCreationFormSchema)
  .query(async ({ ctx }) => getConfigurationCreationForm(ctx))
