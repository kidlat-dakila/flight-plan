import { addComment } from "@/procedures/add-comment"
import { addCommentInputSchema } from "@/procedures/add-comment/utils/schemas"
import { reviewActionOutputSchema } from "@/procedures/get-review/utils/schemas-review-action"
import { toActionOutput } from "@/server/trpc/review-action-output"
import { publicProcedure } from "@/server/trpc/trpc"

export const addCommentRoute = publicProcedure
  .input(addCommentInputSchema)
  .output(reviewActionOutputSchema)
  .mutation(async ({ ctx, input }) => toActionOutput(await addComment(input, ctx)))
