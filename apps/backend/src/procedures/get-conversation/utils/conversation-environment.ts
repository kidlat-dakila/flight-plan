import type { AgentTerminalRegistry } from "@/procedures/open-agent-terminal/utils/agent-terminals"
import type { AgentPresenceRegistry } from "./agent-presence"
import type { ConversationHub } from "./conversation-hub"
import type { ConversationStore } from "./conversation-store"
import type { ReviewerActivityRegistry } from "./reviewer-activity"

export interface ConversationEnvironment {
  readonly store: ConversationStore
  readonly hub: ConversationHub
  readonly presence: AgentPresenceRegistry
  readonly reviewerActivity: ReviewerActivityRegistry
  readonly agentTerminals: AgentTerminalRegistry
  readonly idleLimitMs: number | null
  readonly serverUrl: string
  readonly newId: () => string
}
