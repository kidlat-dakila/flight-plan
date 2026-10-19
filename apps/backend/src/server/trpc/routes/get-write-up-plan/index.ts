import { TRPCError } from "@trpc/server"
import { getWriteUpPlan } from "@/procedures/get-write-up-plan"
import { getWriteUpPlanInputSchema, writeUpPlanSchema } from "@/procedures/get-write-up-plan/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getWriteUpPlanRoute = publicProcedure
  .input(getWriteUpPlanInputSchema)
  .output(writeUpPlanSchema)
  .query(async ({ ctx, input }) => {
    const plan = await getWriteUpPlan(input, ctx)
    if (plan === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "This review target has no review artifact to write up." })
    }
    return plan
  })
