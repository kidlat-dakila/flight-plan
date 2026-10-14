import { TRPCError } from "@trpc/server"
import { getTargetSwitcher } from "@/procedures/get-target-switcher"
import { getTargetSwitcherInputSchema, targetSwitcherSchema } from "@/procedures/get-target-switcher/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_REPOSITORY_MESSAGE = "This repository is no longer listed."

export const getTargetSwitcherRoute = publicProcedure
  .input(getTargetSwitcherInputSchema)
  .output(targetSwitcherSchema)
  .query(async ({ ctx, input }) => {
    const switcher = await getTargetSwitcher(input, ctx)
    if (switcher === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_REPOSITORY_MESSAGE })
    return switcher
  })
