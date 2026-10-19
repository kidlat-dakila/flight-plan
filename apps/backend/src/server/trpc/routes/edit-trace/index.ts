import { TRPCError } from "@trpc/server"
import { editTrace } from "@/procedures/edit-trace"
import { editTraceInputSchema, traceEditingSchema } from "@/procedures/edit-trace/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_ARTIFACT_MESSAGE = "This review target has no Flight Plan to edit."

export const editTraceRoute = publicProcedure
  .input(editTraceInputSchema)
  .output(traceEditingSchema)
  .mutation(async ({ ctx, input }) => {
    const editing = await editTrace(input, ctx)
    if (editing === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_ARTIFACT_MESSAGE })
    return editing
  })
