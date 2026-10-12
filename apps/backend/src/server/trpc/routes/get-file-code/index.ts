import { TRPCError } from "@trpc/server"
import { getFileCode } from "@/procedures/get-file-code"
import { fileCodeSchema, getFileCodeInputSchema } from "@/procedures/get-file-code/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

const MISSING_FILE_MESSAGE = "This file cannot be read at the commit of the Flight Plan."

export const getFileCodeRoute = publicProcedure
  .input(getFileCodeInputSchema)
  .output(fileCodeSchema)
  .query(async ({ ctx, input }) => {
    const fileCode = await getFileCode(input, ctx)
    if (fileCode === null) throw new TRPCError({ code: "NOT_FOUND", message: MISSING_FILE_MESSAGE })
    return fileCode
  })
