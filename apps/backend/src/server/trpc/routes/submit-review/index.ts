import { reviewActionOutputSchema } from "@/procedures/get-review/utils/schemas-review-action"
import { submitReview } from "@/procedures/submit-review"
import { submitReviewInputSchema } from "@/procedures/submit-review/utils/schemas"
import { toActionOutput } from "@/server/trpc/review-action-output"
import { publicProcedure } from "@/server/trpc/trpc"

export const submitReviewRoute = publicProcedure
  .input(submitReviewInputSchema)
  .output(reviewActionOutputSchema)
  .mutation(async ({ ctx, input }) => toActionOutput(await submitReview(input, ctx)))
