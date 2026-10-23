import { recordReviewerActivity } from "@/procedures/record-reviewer-activity"
import { recordReviewerActivityInputSchema, reviewerActivityRecordingSchema } from "@/procedures/record-reviewer-activity/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const recordReviewerActivityRoute = publicProcedure
  .input(recordReviewerActivityInputSchema)
  .output(reviewerActivityRecordingSchema)
  .mutation(async ({ ctx, input }) => await recordReviewerActivity(input, ctx))
