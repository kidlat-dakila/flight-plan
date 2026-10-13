import { TRPCError } from "@trpc/server"
import { editBlast } from "@/procedures/edit-blast"
import { blastEditingSchema, editBlastInputSchema } from "@/procedures/edit-blast/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_ARTIFACT_MESSAGE = "This review target has no Flight Plan to edit."

export const editBlastRoute = publicProcedure
  .input(editBlastInputSchema)
  .output(blastEditingSchema)
  .mutation(async ({ ctx, input }) => {
    const editing = await editBlast(input, ctx)
    if (editing === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_ARTIFACT_MESSAGE })
    return editing
  })
