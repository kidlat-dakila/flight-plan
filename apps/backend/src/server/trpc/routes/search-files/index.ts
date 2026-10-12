import { TRPCError } from "@trpc/server"
import { searchFiles } from "@/procedures/search-files"
import { fileSuggestionsSchema, searchFilesInputSchema } from "@/procedures/search-files/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_ARTIFACT_MESSAGE = "This review target has no Flight Plan to search the files of."

export const searchFilesRoute = publicProcedure
  .input(searchFilesInputSchema)
  .output(fileSuggestionsSchema)
  .query(async ({ ctx, input }) => {
    const suggestions = await searchFiles(input, ctx)
    if (suggestions === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_ARTIFACT_MESSAGE })
    return suggestions
  })
