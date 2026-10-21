import { getUpdateNotice } from "@/procedures/get-update-notice"
import { getUpdateNoticeInputSchema, updateNoticeSchema } from "@/procedures/get-update-notice/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getUpdateNoticeRoute = publicProcedure
  .input(getUpdateNoticeInputSchema)
  .output(updateNoticeSchema.nullable())
  .query(async ({ ctx, input }) => getUpdateNotice(input, ctx))
