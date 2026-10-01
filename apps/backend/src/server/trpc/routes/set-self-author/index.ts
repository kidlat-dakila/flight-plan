import { TRPCError } from "@trpc/server"
import { setSelfAuthor } from "@/procedures/set-self-author"
import { selfAuthorSchema, setSelfAuthorInputSchema } from "@/procedures/set-self-author/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_AUTHOR_MESSAGE = "This repository or author is no longer available."

export const setSelfAuthorRoute = publicProcedure
  .input(setSelfAuthorInputSchema)
  .output(selfAuthorSchema)
  .mutation(async ({ ctx, input }) => {
    const setup = await setSelfAuthor(input, ctx)
    if (setup === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_AUTHOR_MESSAGE })
    return { authorId: input.authorId }
  })
