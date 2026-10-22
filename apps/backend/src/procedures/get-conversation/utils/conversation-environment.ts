import type { AgentPresenceRegistry } from "./agent-presence"
import type { ConversationHub } from "./conversation-hub"
import type { ConversationStore } from "./conversation-store"

export interface ConversationEnvironment {
  readonly store: ConversationStore
  readonly hub: ConversationHub
  readonly presence: AgentPresenceRegistry
  readonly serverUrl: string
  readonly newId: () => string
}
