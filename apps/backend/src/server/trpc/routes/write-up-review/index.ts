import { TRPCError } from "@trpc/server"
import { writeUpReview } from "@/procedures/write-up-review"
import { writeUpResultSchema, writeUpReviewInputSchema } from "@/procedures/write-up-review/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const writeUpReviewRoute = publicProcedure
  .input(writeUpReviewInputSchema)
  .output(writeUpResultSchema)
  .mutation(async ({ ctx, input }) => {
    const result = await writeUpReview(input, ctx)
    if (result === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "This review target has no review artifact to write up." })
    }
    return result
  })
