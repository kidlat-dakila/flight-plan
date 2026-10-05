import { InMemoryAgentRegistry, type RunningAgent } from "@/procedures/get-conversation/utils/agent-registry"
import { KEY, STARTED_AT } from "./conversation-fixture"

const agentOf = (sessionId: string): RunningAgent => ({
  key: KEY,
  agent: "claude",
  sessionId,
  process: null,
  phase: "starting",
  startedAt: STARTED_AT,
  lastActivityAt: STARTED_AT,
  closing: null,
  isAwaitingPermission: false,
  wasReminded: false,
})

describe("InMemoryAgentRegistry", () => {
  it("lets only one agent claim a review target", () => {
    const registry = new InMemoryAgentRegistry()

    expect(registry.claim(agentOf("s1"))).toBe(true)
    expect(registry.claim(agentOf("s2"))).toBe(false)
    expect(registry.findBySessionId("s1")?.key).toStrictEqual(KEY)
  })

  it("releases an agent only for the session that holds the target", () => {
    const registry = new InMemoryAgentRegistry()
    registry.claim(agentOf("s1"))

    expect(registry.release(KEY, "s2")).toBeNull()
    expect(registry.release(KEY, "s1")?.sessionId).toBe("s1")
    expect(registry.find(KEY)).toBeNull()
  })

  it("counts open listeners and remembers when the last one closed", () => {
    const registry = new InMemoryAgentRegistry()
    registry.openListener(KEY)
    registry.openListener(KEY)
    registry.closeListener(KEY, STARTED_AT)

    expect(registry.listenerPresence(KEY)).toStrictEqual({ openCount: 1, lastClosedAt: STARTED_AT })
  })
})
