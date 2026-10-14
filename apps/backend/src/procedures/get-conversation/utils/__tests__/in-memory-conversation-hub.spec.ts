import { createInMemoryConversationHub } from "@/procedures/get-conversation/utils/in-memory-conversation-hub"
import { KEY } from "./conversation-fixture"

const OTHER_KEY = { repositoryName: "other", targetId: "pr-1" }
const NO_SIGNAL = null
const SHORT_TIMEOUT_MS = 10

describe("createInMemoryConversationHub", () => {
  it("wakes a waiting subscription when its review target changes", async () => {
    const hub = createInMemoryConversationHub()
    const subscription = hub.subscribe(KEY)
    const wait = subscription.nextChange({ timeoutMs: null, signal: NO_SIGNAL })

    hub.publish(KEY)

    await expect(wait).resolves.toBe("changed")
  })

  it("keeps a change that arrives before the subscription waits", async () => {
    const hub = createInMemoryConversationHub()
    const subscription = hub.subscribe(KEY)

    hub.publish(KEY)

    await expect(subscription.nextChange({ timeoutMs: null, signal: NO_SIGNAL })).resolves.toBe("changed")
  })

  it("ignores changes to another review target and times out", async () => {
    const hub = createInMemoryConversationHub()
    const subscription = hub.subscribe(KEY)

    hub.publish(OTHER_KEY)

    await expect(subscription.nextChange({ timeoutMs: SHORT_TIMEOUT_MS, signal: NO_SIGNAL })).resolves.toBe("timed-out")
  })

  it("ends a wait when the subscription closes", async () => {
    const hub = createInMemoryConversationHub()
    const subscription = hub.subscribe(KEY)
    const wait = subscription.nextChange({ timeoutMs: null, signal: NO_SIGNAL })

    subscription.close()

    await expect(wait).resolves.toBe("aborted")
  })
})
