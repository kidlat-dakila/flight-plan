import { TRPCError } from "@trpc/server"
import { removeSetupRepository } from "@/procedures/remove-setup-repository"
import {
  removedSetupRepositorySchema,
  removeSetupRepositoryInputSchema,
} from "@/procedures/remove-setup-repository/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_REPOSITORY_MESSAGE = "This repository is no longer in the setup."

export const removeSetupRepositoryRoute = publicProcedure
  .input(removeSetupRepositoryInputSchema)
  .output(removedSetupRepositorySchema)
  .mutation(async ({ ctx, input }) => {
    const setup = await removeSetupRepository(input, ctx)
    if (setup === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_REPOSITORY_MESSAGE })
    return { name: input.name }
  })
