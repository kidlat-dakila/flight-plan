import { TRPCError } from "@trpc/server"
import { buildTextReference } from "@/procedures/build-text-reference"
import { buildTextReferenceInputSchema, textReferenceSchema } from "@/procedures/build-text-reference/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const buildTextReferenceRoute = publicProcedure
  .input(buildTextReferenceInputSchema)
  .output(textReferenceSchema)
  .query(async ({ ctx, input }) => {
    const reference = await buildTextReference(input, ctx)
    if (reference === null) throw new TRPCError({ code: "NOT_FOUND", message: "This review has no artifact yet." })
    return reference
  })
