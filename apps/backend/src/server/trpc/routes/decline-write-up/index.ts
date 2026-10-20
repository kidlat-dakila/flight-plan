import { TRPCError } from "@trpc/server"
import { declineWriteUp } from "@/procedures/decline-write-up"
import { declineWriteUpInputSchema, declineWriteUpResultSchema } from "@/procedures/decline-write-up/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const declineWriteUpRoute = publicProcedure
  .input(declineWriteUpInputSchema)
  .output(declineWriteUpResultSchema)
  .mutation(async ({ ctx, input }) => {
    const result = await declineWriteUp(input, ctx)
    if (result === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "This review target has no review artifact to write up." })
    }
    return result
  })
