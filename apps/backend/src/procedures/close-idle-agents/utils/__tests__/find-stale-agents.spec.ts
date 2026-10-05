import { findStaleAgents } from "@/procedures/close-idle-agents/utils/find-stale-agents"
import { KEY, STARTED_AT } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import type { RunningAgent } from "@/procedures/get-conversation/utils/agent-registry"

const agentOf = (overrides: Partial<RunningAgent>): RunningAgent => ({
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
  ...overrides,
})

const after = (milliseconds: number): Date => new Date(STARTED_AT.getTime() + milliseconds)

describe("findStaleAgents", () => {
  it("finds an agent that never reported its start within 90 seconds", () => {
    const starting = agentOf({ phase: "starting" })

    expect(findStaleAgents([starting], after(60_000))).toStrictEqual([])
    expect(findStaleAgents([starting], after(91_000))).toStrictEqual([{ agent: starting, reason: "start-timeout" }])
  })

  it("finds an agent with no activity for ten minutes", () => {
    const running = agentOf({})

    expect(findStaleAgents([running], after(599_000))).toStrictEqual([])
    expect(findStaleAgents([running], after(601_000))).toStrictEqual([{ agent: running, reason: "idle" }])
  })

  it("never closes an agent that waits on the reviewer's permission or is closing already", () => {
    expect(findStaleAgents([agentOf({ isAwaitingPermission: true }), agentOf({ closing: "turn-ended" })], after(3_600_000))).toStrictEqual([])
  })
})
