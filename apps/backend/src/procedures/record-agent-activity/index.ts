import type { ProcedureContext } from "@/procedures/context"
import { confirmAgentStart } from "@/procedures/get-conversation/utils/conversation-actions"

export interface AgentActivityInput {
  readonly sessionId: string
}

export type ActivityRecording = { readonly kind: "recorded" } | { readonly kind: "unknown-session" }

export const recordAgentActivity = async (
  input: AgentActivityInput,
  context: ProcedureContext,
): Promise<ActivityRecording> =>
  (await confirmAgentStart(input.sessionId, context)) === null ? { kind: "unknown-session" } : { kind: "recorded" }
