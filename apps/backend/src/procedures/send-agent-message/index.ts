import type { ProcedureContext } from "@/procedures/context"
import { listenCommandOf, listenInstructionOf } from "@/procedures/get-conversation/utils/agent-text"
import {
  appendAndPublish,
  findReviewTarget,
  markAgentSeen,
} from "@/procedures/get-conversation/utils/conversation-actions"
import type { AgentMessageSending, SendAgentMessageInput } from "./utils/schemas"

const SENT_NOTE = "Sent to the reviewer."

export const sendAgentMessage = async (input: SendAgentMessageInput, context: ProcedureContext): Promise<AgentMessageSending> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const target = await findReviewTarget(key, context)
  if (target.kind === "rejected") return target
  markAgentSeen(key, context)
  await appendAndPublish(
    key,
    [{ kind: "agent-message", id: context.conversationEnvironment.newId(), body: input.body, sentAt: context.now() }],
    context,
  )
  const command = listenCommandOf(context.conversationEnvironment.serverUrl, key)
  return { kind: "sent", note: `${SENT_NOTE} ${listenInstructionOf(command)}` }
}
