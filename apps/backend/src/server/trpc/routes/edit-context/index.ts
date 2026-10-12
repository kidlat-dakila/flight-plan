import { TRPCError } from "@trpc/server"
import { editContext } from "@/procedures/edit-context"
import { contextEditingSchema, editContextInputSchema } from "@/procedures/edit-context/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_ARTIFACT_MESSAGE = "This review target has no Flight Plan to edit."

export const editContextRoute = publicProcedure
  .input(editContextInputSchema)
  .output(contextEditingSchema)
  .mutation(async ({ ctx, input }) => {
    const editing = await editContext(input, ctx)
    if (editing === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_ARTIFACT_MESSAGE })
    return editing
  })
