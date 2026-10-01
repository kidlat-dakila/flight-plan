import { getSetupGate } from "@/procedures/get-setup-gate"
import { getSetupGateInputSchema, setupGateSchema } from "@/procedures/get-setup-gate/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getSetupGateRoute = publicProcedure
  .input(getSetupGateInputSchema)
  .output(setupGateSchema)
  .query(async ({ ctx, input }) => getSetupGate(input, ctx))
