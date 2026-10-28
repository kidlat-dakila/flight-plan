import { TRPCError } from "@trpc/server"
import { setBaseBranch } from "@/procedures/set-base-branch"
import { baseBranchChoiceSchema, setBaseBranchInputSchema } from "@/procedures/set-base-branch/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_BRANCH_MESSAGE = "This repository or branch is no longer available."

export const setBaseBranchRoute = publicProcedure
  .input(setBaseBranchInputSchema)
  .output(baseBranchChoiceSchema)
  .mutation(async ({ ctx, input }) => {
    const setup = await setBaseBranch(input, ctx)
    if (setup === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_BRANCH_MESSAGE })
    return { baseBranch: input.baseBranch }
  })
