import { TRPCError } from "@trpc/server"
import { addSetupRepository } from "@/procedures/add-setup-repository"
import {
  addedSetupRepositorySchema,
  addSetupRepositoryInputSchema,
} from "@/procedures/add-setup-repository/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const addSetupRepositoryRoute = publicProcedure
  .input(addSetupRepositoryInputSchema)
  .output(addedSetupRepositorySchema)
  .mutation(async ({ ctx, input }) => {
    const plan = await addSetupRepository(input, ctx)
    if (plan.kind === "rejected") throw new TRPCError({ code: "BAD_REQUEST", message: plan.message })
    return { name: plan.repository.name }
  })
