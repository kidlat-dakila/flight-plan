import { TRPCError } from "@trpc/server"
import { editSegments } from "@/procedures/edit-segments"
import { editSegmentsInputSchema, segmentsEditingSchema } from "@/procedures/edit-segments/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_ARTIFACT_MESSAGE = "This review target has no Flight Plan to edit."

export const editSegmentsRoute = publicProcedure
  .input(editSegmentsInputSchema)
  .output(segmentsEditingSchema)
  .mutation(async ({ ctx, input }) => {
    const editing = await editSegments(input, ctx)
    if (editing === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_ARTIFACT_MESSAGE })
    return editing
  })
