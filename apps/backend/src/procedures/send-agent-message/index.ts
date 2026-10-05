import type { ProcedureContext } from "@/procedures/context"
import { isSpawnedFor, listenCommandFor, listenInstructionOf } from "@/procedures/get-conversation/utils/agent-next-step"
import {
  appendAndPublish,
  findReviewTarget,
  markAgentActivity,
} from "@/procedures/get-conversation/utils/conversation-actions"
import type { AgentMessageSending, SendAgentMessageInput } from "./utils/schemas"

const SENT_NOTE = "Sent to the reviewer."

export const sendAgentMessage = async (input: SendAgentMessageInput, context: ProcedureContext): Promise<AgentMessageSending> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const target = await findReviewTarget(key, context)
  if (target.kind === "rejected") return target
  markAgentActivity(key, context)
  await appendAndPublish(
    key,
    [{ kind: "agent-message", id: context.conversationEnvironment.newId(), body: input.body, sentAt: context.now() }],
    context,
  )
  if (isSpawnedFor(key, context)) return { kind: "sent", note: SENT_NOTE }
  const command = listenCommandFor(key, context)
  return { kind: "sent", note: `${SENT_NOTE} If you want the reviewer's reply: ${listenInstructionOf(command)}` }
}
