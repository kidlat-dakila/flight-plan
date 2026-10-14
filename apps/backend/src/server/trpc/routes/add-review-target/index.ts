import { TRPCError } from "@trpc/server"
import { addReviewTarget } from "@/procedures/add-review-target"
import { addedReviewTargetSchema, addReviewTargetInputSchema } from "@/procedures/add-review-target/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_REPOSITORY_MESSAGE = "This repository is no longer listed."

export const addReviewTargetRoute = publicProcedure
  .input(addReviewTargetInputSchema)
  .output(addedReviewTargetSchema)
  .mutation(async ({ ctx, input }) => {
    const addition = await addReviewTarget(input, ctx)
    if (addition === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_REPOSITORY_MESSAGE })
    if (addition.kind === "unavailable") throw new TRPCError({ code: "BAD_REQUEST", message: addition.message })
    return { targetId: addition.targetId }
  })
