import {
  InMemoryAgentPresenceRegistry,
  isAgentOnline,
  NO_PRESENCE,
  ONLINE_WINDOW_MS,
} from "@/procedures/get-conversation/utils/agent-presence"
import { KEY, STARTED_AT } from "./conversation-fixture"

const after = (ms: number): Date => new Date(STARTED_AT.getTime() + ms)

describe("isAgentOnline", () => {
  it("is offline with no stream and no call", () => {
    expect(isAgentOnline(NO_PRESENCE, STARTED_AT)).toBe(false)
  })

  it("is online while a stream is open, however long ago the agent was seen", () => {
    expect(isAgentOnline({ ...NO_PRESENCE, openStreamCount: 1 }, after(ONLINE_WINDOW_MS * 10))).toBe(true)
  })

  it("is online within the window after the last call, and offline after it", () => {
    const presence = { ...NO_PRESENCE, lastSeenAt: STARTED_AT }

    expect(isAgentOnline(presence, after(ONLINE_WINDOW_MS))).toBe(true)
    expect(isAgentOnline(presence, after(ONLINE_WINDOW_MS + 1))).toBe(false)
  })
})

describe("InMemoryAgentPresenceRegistry", () => {
  it("counts open streams and counts a closed stream as the last sight of the agent", () => {
    const registry = new InMemoryAgentPresenceRegistry()
    registry.openStream(KEY)
    registry.openStream(KEY)
    registry.closeStream(KEY, STARTED_AT)

    expect(registry.presenceOf(KEY)).toStrictEqual({ openStreamCount: 1, lastSeenAt: STARTED_AT, claimedThroughSequence: 0 })
  })

  it("remembers when the agent was last seen", () => {
    const registry = new InMemoryAgentPresenceRegistry()
    registry.markSeen(KEY, STARTED_AT)

    expect(registry.presenceOf(KEY).lastSeenAt).toStrictEqual(STARTED_AT)
  })

  it("lets only the first claim of a sequence through", () => {
    const registry = new InMemoryAgentPresenceRegistry()

    expect(registry.claimThrough(KEY, 3)).toBe(true)
    expect(registry.claimThrough(KEY, 3)).toBe(false)
    expect(registry.claimThrough(KEY, 2)).toBe(false)
    expect(registry.claimThrough(KEY, 4)).toBe(true)
  })
})
