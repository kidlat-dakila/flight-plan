import { getReviewPreferences } from "@/procedures/get-review-preferences"
import { getReviewPreferencesInputSchema, reviewPreferencesPageSchema } from "@/procedures/get-review-preferences/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getReviewPreferencesRoute = publicProcedure
  .input(getReviewPreferencesInputSchema)
  .output(reviewPreferencesPageSchema)
  .query(async ({ ctx, input }) => getReviewPreferences(input, ctx))
