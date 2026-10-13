import { reviewActionOutputSchema } from "@/procedures/get-review/utils/schemas-review-action"
import { requestReviewer } from "@/procedures/request-reviewer"
import { reviewerLoginInputSchema } from "@/procedures/request-reviewer/utils/schemas"
import { toActionOutput } from "@/server/trpc/review-action-output"
import { publicProcedure } from "@/server/trpc/trpc"

export const requestReviewerRoute = publicProcedure
  .input(reviewerLoginInputSchema)
  .output(reviewActionOutputSchema)
  .mutation(async ({ ctx, input }) => toActionOutput(await requestReviewer(input, ctx)))
