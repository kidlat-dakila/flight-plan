import type { AgentName } from "./setup"

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
