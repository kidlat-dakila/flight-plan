import { TRPCError } from "@trpc/server"
import { editWalkthrough } from "@/procedures/edit-walkthrough"
import { editWalkthroughInputSchema, walkthroughEditingSchema } from "@/procedures/edit-walkthrough/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_ARTIFACT_MESSAGE = "This review target has no Flight Plan to edit."

export const editWalkthroughRoute = publicProcedure
  .input(editWalkthroughInputSchema)
  .output(walkthroughEditingSchema)
  .mutation(async ({ ctx, input }) => {
    const editing = await editWalkthrough(input, ctx)
    if (editing === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_ARTIFACT_MESSAGE })
    return editing
  })
