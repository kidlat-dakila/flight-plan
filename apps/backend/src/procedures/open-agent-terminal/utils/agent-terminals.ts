import { reviewKeyId } from "@/procedures/get-conversation/utils/conversation"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import type { TerminalWindow } from "./terminal-opener"

export interface AgentTerminalRegistry {
  readonly windowOf: (key: ReviewKey) => TerminalWindow | null
  readonly remember: (key: ReviewKey, window: TerminalWindow) => void
  readonly forget: (key: ReviewKey) => void
}

export class InMemoryAgentTerminalRegistry implements AgentTerminalRegistry {
  private windows: ReadonlyMap<string, TerminalWindow> = new Map()

  public readonly windowOf = (key: ReviewKey): TerminalWindow | null => this.windows.get(reviewKeyId(key)) ?? null

  public readonly remember = (key: ReviewKey, window: TerminalWindow): void => {
    this.windows = new Map([...this.windows, [reviewKeyId(key), window]])
  }

  public readonly forget = (key: ReviewKey): void => {
    this.windows = new Map([...this.windows].filter(([id]) => id !== reviewKeyId(key)))
  }
}
