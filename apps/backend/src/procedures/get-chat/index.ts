import type { ProcedureContext } from "@/procedures/context"
import { buildChat } from "./utils/build-chat"
import type { Chat, GetChatInput } from "./utils/schemas"

export const getChat = async (input: GetChatInput, context: ProcedureContext): Promise<Chat> =>
  buildChat(await context.reviewStore.readChatQuestions(input), context.now())
