import type { ListenerPresence, RunningAgent } from "@/procedures/get-conversation/utils/agent-registry"
import type { ReviewTargetLookup } from "@/procedures/get-conversation/utils/review-target"
import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import type { AgentInstall, AgentName, AgentsChoice } from "@/procedures/get-setup/utils/setup"

export const LISTENER_GRACE_MS = 600_000

export interface DeliveryFacts {
  readonly pendingCount: number
  readonly runningAgent: RunningAgent | null
  readonly listenerPresence: ListenerPresence
  readonly agents: AgentsChoice | null
  readonly spawnableAgents: readonly AgentName[]
  readonly target: ReviewTargetLookup
  readonly now: Date
}

export type DeliveryPlan
  = | { readonly kind: "nothing-pending" }
    | { readonly kind: "agent-running" }
    | { readonly kind: "listener-waiting" }
    | { readonly kind: "unavailable", readonly reason: string }
    | { readonly kind: "spawn", readonly install: AgentInstall, readonly workingPath: string }

const NO_AGENTS_REASON = "Finish the Agents step of the setup so Flight Plan can start an agent."

const unspawnableReason = (agents: AgentsChoice): string => {
  const labels = agents.installs.map((install) => AGENT_LABELS[install.agent]).join(" or ")
  return `Flight Plan can start only Claude. Start ${labels} yourself and have it listen for the reviewer.`
}

const isListenerNear = (presence: ListenerPresence, now: Date): boolean =>
  presence.openCount > 0
  || (presence.lastClosedAt !== null && now.getTime() - presence.lastClosedAt.getTime() < LISTENER_GRACE_MS)

export const chooseInstall = (agents: AgentsChoice, spawnableAgents: readonly AgentName[]): AgentInstall | null => {
  const candidates = agents.installs.filter((install) => spawnableAgents.includes(install.agent))
  return candidates.find((install) => install.agent === agents.defaultAgent) ?? candidates.at(0) ?? null
}

export const planDelivery = (facts: DeliveryFacts): DeliveryPlan => {
  if (facts.pendingCount === 0) return { kind: "nothing-pending" }
  if (facts.runningAgent !== null) return { kind: "agent-running" }
  if (isListenerNear(facts.listenerPresence, facts.now)) return { kind: "listener-waiting" }
  if (facts.target.kind === "rejected") return { kind: "unavailable", reason: facts.target.message }
  if (facts.agents === null) return { kind: "unavailable", reason: NO_AGENTS_REASON }
  const install = chooseInstall(facts.agents, facts.spawnableAgents)
  return install === null
    ? { kind: "unavailable", reason: unspawnableReason(facts.agents) }
    : { kind: "spawn", install, workingPath: facts.target.workingPath }
}
