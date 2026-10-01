import { sendChatMessage } from "@/procedures/send-chat-message"
import { sendChatMessageInputSchema, sentChatMessageSchema } from "@/procedures/send-chat-message/utils/schemas"
import { publicProcedure } from "@/server/trpc/trpc"

export const sendChatMessageRoute = publicProcedure
  .input(sendChatMessageInputSchema)
  .output(sentChatMessageSchema)
  .mutation(async ({ ctx, input }) => sendChatMessage(input, ctx))
