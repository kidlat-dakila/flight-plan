import type { ProcedureContext } from "@/procedures/context"
import { buildConversation } from "./utils/build-conversation"
import type { ConversationKey, ConversationView } from "./utils/schemas"

export const getConversation = async (input: ConversationKey, context: ProcedureContext): Promise<ConversationView> => {
  const { store, agents } = context.conversationEnvironment
  const conversation = await store.read(input)
  return buildConversation(
    { conversation, runningAgent: agents.find(input), listenerPresence: agents.listenerPresence(input) },
    context.now(),
  )
}
