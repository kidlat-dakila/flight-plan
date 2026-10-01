import { getChat } from "@/procedures/get-chat"
import { chatSchema, getChatInputSchema } from "@/procedures/get-chat/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getChatRoute = publicProcedure
  .input(getChatInputSchema)
  .output(chatSchema)
  .query(async ({ ctx, input }) => getChat(input, ctx))
