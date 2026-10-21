import { TRPCError } from "@trpc/server"
import { requestWriteUp } from "@/procedures/request-write-up"
import { requestWriteUpInputSchema, writeUpRequestResultSchema } from "@/procedures/request-write-up/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const requestWriteUpRoute = publicProcedure
  .input(requestWriteUpInputSchema)
  .output(writeUpRequestResultSchema)
  .mutation(async ({ ctx, input }) => {
    const result = await requestWriteUp(input, ctx)
    if (result === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "This review target has no review artifact to explain." })
    }
    return result
  })
