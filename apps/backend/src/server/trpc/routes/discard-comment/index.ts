import { TRPCError } from "@trpc/server"
import { discardComment } from "@/procedures/discard-comment"
import { discardCommentInputSchema } from "@/procedures/discard-comment/utils/schemas"
import { reviewActionOutputSchema } from "@/procedures/get-review/utils/schemas-review-action"
import { publicProcedure } from "@/server/trpc/trpc"

export const discardCommentRoute = publicProcedure
  .input(discardCommentInputSchema)
  .output(reviewActionOutputSchema)
  .mutation(async ({ ctx, input }) => {
    const isDiscarded = await discardComment(input, ctx)
    if (!isDiscarded) throw new TRPCError({ code: "NOT_FOUND", message: "This pending comment is no longer there." })
    return { message: null }
  })
