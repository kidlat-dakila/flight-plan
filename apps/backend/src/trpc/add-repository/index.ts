import { TRPCError } from "@trpc/server"
import { publicProcedure } from "@/trpc/procedures"
import { planRepositoryAddition } from "./utils/plan-repository-addition"
import { addedRepositorySchema, addRepositoryInputSchema } from "./utils/schemas"

export const addRepositoryProcedure = publicProcedure
  .input(addRepositoryInputSchema)
  .output(addedRepositorySchema)
  .mutation(async ({ ctx, input }) => {
    const addition = planRepositoryAddition(await ctx.repositoryStore.list(), input.path)
    if (addition.kind === "rejected") throw new TRPCError({ code: "BAD_REQUEST", message: addition.message })
    await ctx.repositoryStore.add(addition.repository)
    return { name: addition.repository.name }
  })
