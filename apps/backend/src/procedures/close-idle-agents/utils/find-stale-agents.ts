import type { RunningAgent } from "@/procedures/get-conversation/utils/agent-registry"

export const AGENT_START_TIMEOUT_MS = 90_000
export const AGENT_IDLE_MS = 600_000

export type StaleReason = "start-timeout" | "idle"

export interface StaleAgent {
  readonly agent: RunningAgent
  readonly reason: StaleReason
}

const ageMs = (since: Date, now: Date): number => now.getTime() - since.getTime()

const staleReasonOf = (agent: RunningAgent, now: Date): StaleReason | null => {
  if (agent.closing !== null || agent.isAwaitingPermission) return null
  if (agent.phase === "starting") return ageMs(agent.startedAt, now) > AGENT_START_TIMEOUT_MS ? "start-timeout" : null
  return ageMs(agent.lastActivityAt, now) > AGENT_IDLE_MS ? "idle" : null
}

export const findStaleAgents = (agents: readonly RunningAgent[], now: Date): readonly StaleAgent[] =>
  agents.flatMap((agent) => {
    const reason = staleReasonOf(agent, now)
    return reason === null ? [] : [{ agent, reason }]
  })
