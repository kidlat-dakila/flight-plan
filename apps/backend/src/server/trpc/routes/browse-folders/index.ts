import { TRPCError } from "@trpc/server"
import { browseFolders } from "@/procedures/browse-folders"
import { browseFoldersInputSchema, folderBrowserSchema } from "@/procedures/browse-folders/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_FOLDER_MESSAGE = "This folder does not exist or cannot be read."

export const browseFoldersRoute = publicProcedure
  .input(browseFoldersInputSchema)
  .output(folderBrowserSchema)
  .query(async ({ ctx, input }) => {
    const browser = await browseFolders(input, ctx)
    if (browser === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_FOLDER_MESSAGE })
    return browser
  })
