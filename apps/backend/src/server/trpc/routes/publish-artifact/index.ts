import { TRPCError } from "@trpc/server"
import { publishArtifact } from "@/procedures/publish-artifact"
import { publishArtifactInputSchema, publishedArtifactSchema } from "@/procedures/publish-artifact/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const publishArtifactRoute = publicProcedure
  .input(publishArtifactInputSchema)
  .output(publishedArtifactSchema)
  .mutation(async ({ ctx, input }) => {
    const published = await publishArtifact(input, ctx)
    if (published === null) {
      throw new TRPCError({ code: "NOT_FOUND", message: "This review artifact cannot be published there." })
    }
    return published
  })
