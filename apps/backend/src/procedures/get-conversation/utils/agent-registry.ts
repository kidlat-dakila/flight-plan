import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import type { AgentName } from "@/procedures/get-setup/utils/setup"
import { reviewKeyId } from "./conversation"

export type AgentPhase = "starting" | "running"

export const AGENT_CLOSINGS = ["turn-ended", "idle", "start-timeout", "shutdown"] as const

export type AgentClosing = (typeof AGENT_CLOSINGS)[number]

export const shouldRedeliverAfter = (closing: AgentClosing): boolean => closing === "turn-ended" || closing === "idle"

export interface AgentProcess {
  readonly stop: () => void
  readonly readOutput: () => string
}

export interface RunningAgent {
  readonly key: ReviewKey
  readonly agent: AgentName
  readonly sessionId: string
  readonly process: AgentProcess | null
  readonly phase: AgentPhase
  readonly startedAt: Date
  readonly lastActivityAt: Date
  readonly closing: AgentClosing | null
  readonly isAwaitingPermission: boolean
  readonly wasReminded: boolean
}

export interface ListenerPresence {
  readonly openCount: number
  readonly lastClosedAt: Date | null
}

export interface AgentRegistry {
  readonly find: (key: ReviewKey) => RunningAgent | null
  readonly findBySessionId: (sessionId: string) => RunningAgent | null
  readonly claim: (agent: RunningAgent) => boolean
  readonly update: (key: ReviewKey, change: (agent: RunningAgent) => RunningAgent) => RunningAgent | null
  readonly release: (key: ReviewKey, sessionId: string) => RunningAgent | null
  readonly list: () => readonly RunningAgent[]
  readonly openListener: (key: ReviewKey) => void
  readonly closeListener: (key: ReviewKey, closedAt: Date) => void
  readonly listenerPresence: (key: ReviewKey) => ListenerPresence
}

const NO_LISTENER: ListenerPresence = { openCount: 0, lastClosedAt: null }

export class InMemoryAgentRegistry implements AgentRegistry {
  private agents: ReadonlyMap<string, RunningAgent> = new Map()
  private listeners: ReadonlyMap<string, ListenerPresence> = new Map()

  public readonly find = (key: ReviewKey): RunningAgent | null => this.agents.get(reviewKeyId(key)) ?? null

  public readonly findBySessionId = (sessionId: string): RunningAgent | null =>
    [...this.agents.values()].find((agent) => agent.sessionId === sessionId) ?? null

  public readonly claim = (agent: RunningAgent): boolean => {
    if (this.agents.has(reviewKeyId(agent.key))) return false
    this.agents = new Map([...this.agents, [reviewKeyId(agent.key), agent]])
    return true
  }

  public readonly update = (key: ReviewKey, change: (agent: RunningAgent) => RunningAgent): RunningAgent | null => {
    const current = this.find(key)
    if (current === null) return null
    const changed = change(current)
    this.agents = new Map([...this.agents, [reviewKeyId(key), changed]])
    return changed
  }

  public readonly release = (key: ReviewKey, sessionId: string): RunningAgent | null => {
    const current = this.find(key)
    if (current?.sessionId !== sessionId) return null
    this.agents = new Map([...this.agents].filter(([id]) => id !== reviewKeyId(key)))
    return current
  }

  public readonly list = (): readonly RunningAgent[] => [...this.agents.values()]

  public readonly openListener = (key: ReviewKey): void => {
    const presence = this.listenerPresence(key)
    this.listeners = new Map([...this.listeners, [reviewKeyId(key), { ...presence, openCount: presence.openCount + 1 }]])
  }

  public readonly closeListener = (key: ReviewKey, closedAt: Date): void => {
    const presence = this.listenerPresence(key)
    const openCount = Math.max(presence.openCount - 1, 0)
    this.listeners = new Map([...this.listeners, [reviewKeyId(key), { openCount, lastClosedAt: closedAt }]])
  }

  public readonly listenerPresence = (key: ReviewKey): ListenerPresence =>
    this.listeners.get(reviewKeyId(key)) ?? NO_LISTENER
}
