import type { ProcedureContext } from "@/procedures/context"
import { listenCommandOf } from "@/procedures/get-conversation/utils/agent-text"
import { findReviewTarget, markAgentSeen } from "@/procedures/get-conversation/utils/conversation-actions"
import type { PingRecording, RecordPingInput } from "./utils/schemas"

const recordedNoteOf = (listenCommand: string): string =>
  `Flight Plan shows the reviewer that you are online. The review's listen command:\n${listenCommand}`

export const recordPing = async (input: RecordPingInput, context: ProcedureContext): Promise<PingRecording> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const target = await findReviewTarget(key, context)
  if (target.kind === "rejected") return target
  markAgentSeen(key, context)
  return { kind: "recorded", note: recordedNoteOf(listenCommandOf(context.conversationEnvironment.serverUrl, key)) }
}
