import type { ProcedureContext } from "@/procedures/context"
import { getConversation } from "@/procedures/get-conversation"
import { readsOnChange } from "@/procedures/get-conversation/utils/conversation-hub"
import type { ConversationKey, ConversationView } from "@/procedures/get-conversation/utils/schemas"

export const watchConversation = async function* (
  input: ConversationKey,
  context: ProcedureContext,
  signal: AbortSignal | null,
): AsyncGenerator<ConversationView> {
  const subscription = context.conversationEnvironment.hub.subscribe(input)
  try {
    yield await getConversation(input, context)
    yield* readsOnChange(subscription, { signal, remainingMs: null }, async () => await getConversation(input, context))
  } finally {
    subscription.close()
  }
}
