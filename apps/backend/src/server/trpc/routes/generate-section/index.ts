import { TRPCError } from "@trpc/server"
import { generateSection } from "@/procedures/generate-section"
import { generateSectionInputSchema, generateSectionResultSchema } from "@/procedures/generate-section/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const generateSectionRoute = publicProcedure
  .input(generateSectionInputSchema)
  .output(generateSectionResultSchema)
  .mutation(async ({ ctx, input }) => {
    const result = await generateSection(input, ctx)
    if (result === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "This review target has no review artifact to generate a section of." })
    }
    return result
  })
