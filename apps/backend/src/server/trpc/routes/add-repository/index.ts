import { TRPCError } from "@trpc/server"
import { addRepository } from "@/procedures/add-repository"
import { addedRepositorySchema, addRepositoryInputSchema } from "@/procedures/add-repository/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const addRepositoryRoute = publicProcedure
  .input(addRepositoryInputSchema)
  .output(addedRepositorySchema)
  .mutation(async ({ ctx, input }) => {
    const addition = await addRepository(input, ctx)
    if (addition.kind === "rejected") throw new TRPCError({ code: "BAD_REQUEST", message: addition.message })
    return { name: addition.repository.name }
  })
