import { getSettings } from "@/procedures/get-settings"
import { getSettingsInputSchema, settingsPageSchema } from "@/procedures/get-settings/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getSettingsRoute = publicProcedure
  .input(getSettingsInputSchema)
  .output(settingsPageSchema)
  .query(async ({ ctx, input }) => getSettings(input, ctx))
