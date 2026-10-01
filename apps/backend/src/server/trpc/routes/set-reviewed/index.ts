import { TRPCError } from "@trpc/server"
import { setReviewed } from "@/procedures/set-reviewed"
import { reviewedChangeSchema, setReviewedInputSchema } from "@/procedures/set-reviewed/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const setReviewedRoute = publicProcedure
  .input(setReviewedInputSchema)
  .output(reviewedChangeSchema)
  .mutation(async ({ ctx, input }) => {
    const change = await setReviewed(input, ctx)
    if (change === null) throw new TRPCError({ code: "NOT_FOUND", message: "This review no longer has that waypoint or file." })
    return change
  })
