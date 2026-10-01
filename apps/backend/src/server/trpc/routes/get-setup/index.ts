import { getSetup } from "@/procedures/get-setup"
import { getSetupInputSchema, setupPageSchema } from "@/procedures/get-setup/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getSetupRoute = publicProcedure
  .input(getSetupInputSchema)
  .output(setupPageSchema)
  .query(async ({ ctx, input }) => getSetup(input, ctx))
