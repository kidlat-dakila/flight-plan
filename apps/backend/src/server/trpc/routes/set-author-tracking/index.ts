import { TRPCError } from "@trpc/server"
import { setAuthorTracking } from "@/procedures/set-author-tracking"
import { authorTrackingSchema, setAuthorTrackingInputSchema } from "@/procedures/set-author-tracking/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_AUTHOR_MESSAGE = "This repository or author is no longer available."

export const setAuthorTrackingRoute = publicProcedure
  .input(setAuthorTrackingInputSchema)
  .output(authorTrackingSchema)
  .mutation(async ({ ctx, input }) => {
    const setup = await setAuthorTracking(input, ctx)
    if (setup === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_AUTHOR_MESSAGE })
    return { authorId: input.authorId }
  })
