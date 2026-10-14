import type { ProcedureContext } from "@/procedures/context"
import type { ConversationKey } from "@/procedures/get-conversation/utils/schemas"
import { buildModelChoice } from "./utils/build-model-choice"
import { readChatWriter } from "./utils/chat-writer"
import type { ModelChoiceView } from "./utils/schemas"

export const getModelChoice = async (input: ConversationKey, context: ProcedureContext): Promise<ModelChoiceView | null> =>
  buildModelChoice(await readChatWriter(input, context))
