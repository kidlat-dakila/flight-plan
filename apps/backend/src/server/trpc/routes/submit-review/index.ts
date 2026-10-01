import { TRPCError } from "@trpc/server"
import { submitReview } from "@/procedures/submit-review"
import { submitReviewInputSchema, submittedReviewSchema } from "@/procedures/submit-review/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const submitReviewRoute = publicProcedure
  .input(submitReviewInputSchema)
  .output(submittedReviewSchema)
  .mutation(async ({ ctx, input }) => {
    const result = await submitReview(input, ctx)
    if (result.kind === "unavailable") throw new TRPCError({ code: "NOT_FOUND", message: result.message })
    if (result.kind === "empty") throw new TRPCError({ code: "BAD_REQUEST", message: result.message })
    return { message: result.message }
  })
