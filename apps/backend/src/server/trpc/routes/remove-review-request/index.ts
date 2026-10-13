import { reviewActionOutputSchema } from "@/procedures/get-review/utils/schemas-review-action"
import { removeReviewRequest } from "@/procedures/remove-review-request"
import { reviewerLoginInputSchema } from "@/procedures/request-reviewer/utils/schemas"
import { toActionOutput } from "@/server/trpc/review-action-output"
import { publicProcedure } from "@/server/trpc/trpc"

export const removeReviewRequestRoute = publicProcedure
  .input(reviewerLoginInputSchema)
  .output(reviewActionOutputSchema)
  .mutation(async ({ ctx, input }) => toActionOutput(await removeReviewRequest(input, ctx)))
