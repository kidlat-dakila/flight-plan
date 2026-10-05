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
    label: "Flight Plan talks to the agent",
    tagLabel: "Recommended",
    description:
      "Flight Plan starts the agent's own command line program and sends it your requests. It does not use the agent's SDK, so it adds no billing on top of your normal use.",
    summary: "Flight Plan talks to the agent",
    unavailableFeatures: [],
  },
  manual: {
    label: "You prompt the agent yourself",
    tagLabel: null,
    description: "Flight Plan gives you each prompt, and you paste it into your own agent session.",
    summary: "You prompt the agent yourself",
    unavailableFeatures: ["Chatting with the agent from a review", "Applying a fix from a finding"],
  },
}
