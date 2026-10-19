import { TRPCError } from "@trpc/server"
import { editJourney } from "@/procedures/edit-journey"
import { editJourneyInputSchema, journeyEditingSchema } from "@/procedures/edit-journey/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_ARTIFACT_MESSAGE = "This review target has no Flight Plan to edit."

export const editJourneyRoute = publicProcedure
  .input(editJourneyInputSchema)
  .output(journeyEditingSchema)
  .mutation(async ({ ctx, input }) => {
    const editing = await editJourney(input, ctx)
    if (editing === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_ARTIFACT_MESSAGE })
    return editing
  })
