import { reviewActionOutputSchema } from "@/procedures/get-review/utils/schemas-review-action"
import { replyToThread } from "@/procedures/reply-to-thread"
import { replyToThreadInputSchema } from "@/procedures/reply-to-thread/utils/schemas"
import { toActionOutput } from "@/server/trpc/review-action-output"
import { publicProcedure } from "@/server/trpc/trpc"

export const replyToThreadRoute = publicProcedure
  .input(replyToThreadInputSchema)
  .output(reviewActionOutputSchema)
  .mutation(async ({ ctx, input }) => toActionOutput(await replyToThread(input, ctx)))
