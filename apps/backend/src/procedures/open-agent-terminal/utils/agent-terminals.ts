import { reviewKeyId } from "@/procedures/get-conversation/utils/conversation"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import type { AgentTab } from "./terminal-opener"

export interface AgentTerminalRegistry {
  readonly tabOf: (key: ReviewKey) => AgentTab | null
  readonly remember: (key: ReviewKey, tab: AgentTab) => void
  readonly forget: (key: ReviewKey) => void
}

export class InMemoryAgentTerminalRegistry implements AgentTerminalRegistry {
  private tabs: ReadonlyMap<string, AgentTab> = new Map()

  public readonly tabOf = (key: ReviewKey): AgentTab | null => this.tabs.get(reviewKeyId(key)) ?? null

  public readonly remember = (key: ReviewKey, tab: AgentTab): void => {
    this.tabs = new Map([...this.tabs, [reviewKeyId(key), tab]])
  }

  public readonly forget = (key: ReviewKey): void => {
    this.tabs = new Map([...this.tabs].filter(([id]) => id !== reviewKeyId(key)))
  }
}
