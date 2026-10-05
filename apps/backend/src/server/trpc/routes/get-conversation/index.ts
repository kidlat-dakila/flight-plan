import { getConversation } from "@/procedures/get-conversation"
import { conversationKeySchema, conversationViewSchema } from "@/procedures/get-conversation/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const getConversationRoute = publicProcedure
  .input(conversationKeySchema)
  .output(conversationViewSchema)
  .query(async ({ ctx, input }) => getConversation(input, ctx))
