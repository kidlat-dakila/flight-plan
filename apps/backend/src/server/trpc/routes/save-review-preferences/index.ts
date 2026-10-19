import { saveReviewPreferences } from "@/procedures/save-review-preferences"
import { preferencesSavingSchema, saveReviewPreferencesInputSchema } from "@/procedures/save-review-preferences/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const saveReviewPreferencesRoute = publicProcedure
  .input(saveReviewPreferencesInputSchema)
  .output(preferencesSavingSchema)
  .mutation(async ({ ctx, input }) => saveReviewPreferences(input, ctx))
