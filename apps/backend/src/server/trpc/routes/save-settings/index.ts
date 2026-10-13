import { saveSettings } from "@/procedures/save-settings"
import { saveSettingsInputSchema, settingsSavingSchema } from "@/procedures/save-settings/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const saveSettingsRoute = publicProcedure
  .input(saveSettingsInputSchema)
  .output(settingsSavingSchema)
  .mutation(async ({ ctx, input }) => saveSettings(input, ctx))
