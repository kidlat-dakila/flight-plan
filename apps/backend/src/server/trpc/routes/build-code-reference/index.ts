import { TRPCError } from "@trpc/server"
import { buildCodeReference } from "@/procedures/build-code-reference"
import { buildCodeReferenceInputSchema, codeReferenceSchema } from "@/procedures/build-code-reference/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const buildCodeReferenceRoute = publicProcedure
  .input(buildCodeReferenceInputSchema)
  .output(codeReferenceSchema)
  .query(async ({ ctx, input }) => {
    const reference = await buildCodeReference(input, ctx)
    if (reference === null) throw new TRPCError({ code: "NOT_FOUND", message: "This review does not cite that file." })
    return reference
  })
