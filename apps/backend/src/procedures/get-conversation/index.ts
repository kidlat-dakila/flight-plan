import type { ProcedureContext } from "@/procedures/context"
import { buildConversation } from "./utils/build-conversation"
import { isAgentOnlineFor } from "./utils/conversation-actions"
import type { ConversationKey, ConversationView } from "./utils/schemas"

export const getConversation = async (input: ConversationKey, context: ProcedureContext): Promise<ConversationView> => {
  const conversation = await context.conversationEnvironment.store.read(input)
  return buildConversation({ conversation, isAgentOnline: isAgentOnlineFor(input, context) }, context.now())
}
