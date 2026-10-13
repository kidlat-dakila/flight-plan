import { importReview } from "@/procedures/import-review"
import { importReviewInputSchema, reviewImportSchema } from "@/procedures/import-review/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const importReviewRoute = publicProcedure
  .input(importReviewInputSchema)
  .output(reviewImportSchema)
  .mutation(async ({ ctx, input }) => await importReview(input, ctx))
