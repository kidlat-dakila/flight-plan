import { TRPCError } from "@trpc/server"
import { dismissNewTarget } from "@/procedures/dismiss-new-target"
import { dismissedNewTargetSchema, dismissNewTargetInputSchema } from "@/procedures/dismiss-new-target/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const dismissNewTargetRoute = publicProcedure
  .input(dismissNewTargetInputSchema)
  .output(dismissedNewTargetSchema)
  .mutation(async ({ ctx, input }) => {
    const repository = await dismissNewTarget(input, ctx)
    if (repository === null) throw new TRPCError({ code: "NOT_FOUND", message: "This review target is no longer listed." })
    return { targetId: input.targetId }
  })
