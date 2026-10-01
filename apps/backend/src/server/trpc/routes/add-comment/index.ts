import { TRPCError } from "@trpc/server"
import { addComment } from "@/procedures/add-comment"
import { addCommentInputSchema, addedCommentSchema } from "@/procedures/add-comment/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const addCommentRoute = publicProcedure
  .input(addCommentInputSchema)
  .output(addedCommentSchema)
  .mutation(async ({ ctx, input }) => {
    const added = await addComment(input, ctx)
    if (added === null) throw new TRPCError({ code: "NOT_FOUND", message: "This comment thread is no longer there." })
    return added
  })
