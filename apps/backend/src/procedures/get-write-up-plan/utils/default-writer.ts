import type { ReviewWriter } from "@/procedures/get-review/utils/start/review-request"
import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import type { AgentName, AgentsChoice } from "@/procedures/get-setup/utils/setup"

export interface DefaultWriter {
  readonly label: string
  readonly writer: ReviewWriter
}

export const defaultWriterOf = (agents: AgentsChoice | null, startableAgents: readonly AgentName[]): DefaultWriter | null => {
  const install = agents?.installs.find((candidate) => candidate.agent === agents.defaultAgent) ?? agents?.installs.at(0)
  if (install === undefined) return null
  return {
    label: AGENT_LABELS[install.agent],
    writer: startableAgents.includes(install.agent)
      ? { kind: "agent", agent: install.agent, model: install.model, effort: install.effort }
      : { kind: "external", agent: install.agent },
  }
}
