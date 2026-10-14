import type { AgentConnection, AgentName } from "./setup"

export const AGENT_LABELS: Record<AgentName, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
}

export const AGENT_CLI_NAMES: Record<AgentName, string> = {
  claude: "claude",
  codex: "codex",
  cursor: "cursor-agent",
}

export interface ConnectionOffer {
  readonly label: string
  readonly tagLabel: string | null
  readonly description: string
  readonly summary: string
  readonly unavailableFeatures: readonly string[]
}

export const CONNECTION_OFFERS: Record<AgentConnection, ConnectionOffer> = {
  direct: {
    label: "Automatic",
    tagLabel: "Recommended",
    description:
      "Flight Plan starts your agent's command line program and sends it each request. It doesn't use the agent's SDK, so you pay nothing beyond your normal use.",
    summary: "Automatic",
    unavailableFeatures: [],
  },
  manual: {
    label: "Manual",
    tagLabel: null,
    description: "Flight Plan gives you each prompt, and you paste it into your own agent session.",
    summary: "Manual",
    unavailableFeatures: ["Chatting with the agent from a review", "Applying a fix from a finding"],
  },
}
