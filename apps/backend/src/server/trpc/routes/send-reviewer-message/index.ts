import { sendReviewerMessage } from "@/procedures/send-reviewer-message"
import {
  reviewerMessageSendingSchema,
  sendReviewerMessageInputSchema,
} from "@/procedures/send-reviewer-message/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const sendReviewerMessageRoute = publicProcedure
  .input(sendReviewerMessageInputSchema)
  .output(reviewerMessageSendingSchema)
  .mutation(async ({ ctx, input }) => sendReviewerMessage(input, ctx))
