import type { ProcedureContext } from "@/procedures/context"
import { findReviewTarget, isAgentOnlineFor } from "@/procedures/get-conversation/utils/conversation-actions"
import { LIVE_AGENTS } from "@/procedures/get-review/utils/start/live-agents"
import { defaultWriterOf } from "@/procedures/get-write-up-plan/utils/default-writer"
import { buildLiveAgent } from "./utils/build-live-agent"
import type { GetLiveAgentInput, LiveAgent } from "./utils/schemas"

const UNAVAILABLE: LiveAgent = { kind: "unavailable" }

export const getLiveAgent = async (input: GetLiveAgentInput, context: ProcedureContext): Promise<LiveAgent> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [target, setup] = await Promise.all([findReviewTarget(key, context), context.setupStore.read()])
  const writer = defaultWriterOf(setup.agents, LIVE_AGENTS)
  if (target.kind === "rejected" || writer === null) return UNAVAILABLE
  return buildLiveAgent({
    key,
    agent: writer.agent,
    isLiveAgent: writer.writer.kind === "agent",
    canOpenTerminal: context.openTerminal !== null,
    isOnline: isAgentOnlineFor(key, context),
    idleStoppedAt: context.conversationEnvironment.reviewerActivity.activityOf(key).idleStoppedAt,
  })
}
