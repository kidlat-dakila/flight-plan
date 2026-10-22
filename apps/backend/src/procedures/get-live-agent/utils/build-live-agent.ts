import { liveCommandOf } from "@/procedures/get-conversation/utils/agent-text"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import type { AgentName } from "@/procedures/get-setup/utils/setup"
import type { LaunchAgentDialog, LiveAgent } from "./schemas"

export interface LiveAgentFacts {
  readonly key: ReviewKey
  readonly agent: AgentName
  readonly isLiveAgent: boolean
  readonly canOpenTerminal: boolean
  readonly isOnline: boolean
}

const externalLivePromptOf = (key: ReviewKey): string =>
  `Use the flightplan-review skill and Flight Plan's MCP tools on repositoryName "${key.repositoryName}" and targetId "${key.targetId}". Write what the review still needs, answer the reviewer, and keep listening with the curl command the tools give you.`

const promptOf = (facts: LiveAgentFacts): string => (facts.isLiveAgent ? liveCommandOf(facts.key) : externalLivePromptOf(facts.key))

const dialogOf = (facts: LiveAgentFacts): LaunchAgentDialog => {
  const agentLabel = AGENT_LABELS[facts.agent]
  return {
    title: `${agentLabel} is offline`,
    description: `${agentLabel} writes up this review and answers you in Chat. Start it in a terminal and leave it open while you review.`,
    terminal: facts.isLiveAgent && facts.canOpenTerminal
      ? { label: "Open a terminal for me", description: `Flight Plan opens Terminal in the repository's folder and starts ${agentLabel} there.` }
      : null,
    manual: {
      label: "I'll start it myself",
      description: `Start ${agentLabel} in the repository's folder and run this.`,
      prompt: promptOf(facts),
      copyLabel: "Copy the command",
      copiedMessage: "Command copied",
    },
    closeLabel: "Not now",
  }
}

export const buildLiveAgent = (facts: LiveAgentFacts): LiveAgent => ({
  kind: "live",
  isOnline: facts.isOnline,
  statusLabel: `${AGENT_LABELS[facts.agent]} ${facts.isOnline ? "online" : "offline"}`,
  dialog: dialogOf(facts),
})
