import { createReview } from "@/procedures/create-review"
import { createReviewInputSchema, createReviewResultSchema } from "@/procedures/create-review/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const createReviewRoute = publicProcedure
  .input(createReviewInputSchema)
  .output(createReviewResultSchema)
  .mutation(async ({ ctx, input }) => await createReview(input, ctx))
