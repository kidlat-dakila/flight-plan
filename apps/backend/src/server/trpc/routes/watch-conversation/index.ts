import { conversationKeySchema } from "@/procedures/get-conversation/utils/schemas"
import { watchConversation } from "@/procedures/watch-conversation"
import { publicProcedure } from "@/server/trpc/trpc"

export const watchConversationRoute = publicProcedure
  .input(conversationKeySchema)
  .subscription(({ ctx, input, signal }) => watchConversation(input, ctx, signal ?? null))
