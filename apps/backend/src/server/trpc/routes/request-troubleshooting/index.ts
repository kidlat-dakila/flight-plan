import { requestTroubleshooting } from "@/procedures/request-troubleshooting"
import { requestTroubleshootingInputSchema, troubleshootingOpeningSchema } from "@/procedures/request-troubleshooting/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const requestTroubleshootingRoute = publicProcedure
  .input(requestTroubleshootingInputSchema)
  .output(troubleshootingOpeningSchema)
  .mutation(async ({ ctx, input }) => await requestTroubleshooting(input, ctx))
