import { TRPCError } from "@trpc/server"
import { completeSetup } from "@/procedures/complete-setup"
import { completedSetupSchema, completeSetupInputSchema } from "@/procedures/complete-setup/utils/schemas"
import { HOME_PATH } from "@/procedures/get-setup-gate/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const completeSetupRoute = publicProcedure
  .input(completeSetupInputSchema)
  .output(completedSetupSchema)
  .mutation(async ({ ctx, input }) => {
    const completion = await completeSetup(input, ctx)
    if (completion.kind === "rejected") throw new TRPCError({ code: "BAD_REQUEST", message: completion.message })
    return { redirectTo: HOME_PATH }
  })
