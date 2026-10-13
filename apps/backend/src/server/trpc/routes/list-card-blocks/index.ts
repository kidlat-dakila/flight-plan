import { TRPCError } from "@trpc/server"
import { listCardBlocks } from "@/procedures/list-card-blocks"
import { cardBlocksSchema, listCardBlocksInputSchema } from "@/procedures/list-card-blocks/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_FILE_MESSAGE = "This file could not be read at the commit of the Flight Plan."

export const listCardBlocksRoute = publicProcedure
  .input(listCardBlocksInputSchema)
  .output(cardBlocksSchema)
  .query(async ({ ctx, input }) => {
    const blocks = await listCardBlocks(input, ctx)
    if (blocks === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_FILE_MESSAGE })
    return blocks
  })
