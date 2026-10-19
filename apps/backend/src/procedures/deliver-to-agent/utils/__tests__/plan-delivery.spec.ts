import { planDelivery, type DeliveryFacts } from "@/procedures/deliver-to-agent/utils/plan-delivery"
import { CLAUDE_AGENTS, KEY, STARTED_AT } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import type { RunningAgent } from "@/procedures/get-conversation/utils/agent-registry"

const RUNNING: RunningAgent = {
  key: KEY,
  agent: "claude",
  sessionId: "s1",
  process: null,
  phase: "running",
  startedAt: STARTED_AT,
  lastActivityAt: STARTED_AT,
  closing: null,
  isAwaitingPermission: false,
  wasReminded: false,
}

const factsOf = (overrides: Partial<DeliveryFacts>): DeliveryFacts => ({
  pendingCount: 1,
  runningAgent: null,
  listenerPresence: { openCount: 0, lastClosedAt: null },
  agents: CLAUDE_AGENTS,
  spawnableAgents: ["claude"],
  target: { kind: "found", workingPath: "/Users/dev/projects/storefront" },
  now: STARTED_AT,
  ...overrides,
})

describe("planDelivery", () => {
  it("starts the default agent in the repository folder when a reply waits and nobody can take it", () => {
    expect(planDelivery(factsOf({}))).toStrictEqual({
      kind: "spawn",
      install: CLAUDE_AGENTS.installs[0],
      workingPath: "/Users/dev/projects/storefront",
    })
  })

  it("does nothing while nothing waits", () => {
    expect(planDelivery(factsOf({ pendingCount: 0 }))).toStrictEqual({ kind: "nothing-pending" })
  })

  it("leaves the reply to a running agent, which receives it when its turn ends", () => {
    expect(planDelivery(factsOf({ runningAgent: RUNNING }))).toStrictEqual({ kind: "agent-running" })
  })

  it("leaves the reply to a session that listens, or listened within the grace period", () => {
    expect(planDelivery(factsOf({ listenerPresence: { openCount: 1, lastClosedAt: null } }))).toStrictEqual({ kind: "listener-waiting" })
    const recently = new Date(STARTED_AT.getTime() - 60_000)
    expect(planDelivery(factsOf({ listenerPresence: { openCount: 0, lastClosedAt: recently } }))).toStrictEqual({ kind: "listener-waiting" })
    const longAgo = new Date(STARTED_AT.getTime() - 3_600_000)
    expect(planDelivery(factsOf({ listenerPresence: { openCount: 0, lastClosedAt: longAgo } }))).toMatchObject({ kind: "spawn" })
  })

  it("says why no agent can be started", () => {
    expect(planDelivery(factsOf({ agents: null }))).toStrictEqual({
      kind: "unavailable",
      reason: "Finish the Agents step of the setup so Flight Plan can start an agent.",
    })
    expect(planDelivery(factsOf({ target: { kind: "rejected", message: "No repository." } }))).toStrictEqual({ kind: "unavailable", reason: "No repository." })
    const codexOnly = { ...CLAUDE_AGENTS, installs: [{ agent: "codex", installPath: "/Users/dev/.codex", model: "default", effort: "default" }], defaultAgent: "codex" } as const
    expect(planDelivery(factsOf({ agents: codexOnly }))).toStrictEqual({
      kind: "unavailable",
      reason: "Flight Plan can start only Claude. Start Codex yourself and have it listen for the reviewer.",
    })
  })

  it("starts a spawnable agent when the default one cannot be started", () => {
    const agents = {
      installs: [
        { agent: "codex", installPath: "/Users/dev/.codex", model: "default", effort: "default" },
        { agent: "claude", installPath: "/Users/dev/.claude", model: "sonnet", effort: "default" },
      ],
      defaultAgent: "codex",
    } as const

    expect(planDelivery(factsOf({ agents }))).toMatchObject({ kind: "spawn", install: { agent: "claude", model: "sonnet" } })
  })
})
