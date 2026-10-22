import { createConversationHub } from "@/utils/conversation-hub"

const KEY = { repositoryName: "storefront", targetId: "pr-412" }
const OTHER_KEY = { repositoryName: "storefront", targetId: "pr-7" }
const SUBSCRIBER_COUNT = 12

describe("createConversationHub", () => {
  it("wakes a subscriber of the review target that changed", async () => {
    const hub = createConversationHub()
    const subscription = hub.subscribe(KEY)
    const waiting = subscription.nextChange({ timeoutMs: null, signal: null })

    hub.publish(KEY)

    await expect(waiting).resolves.toBe("changed")
    subscription.close()
    await hub.close()
  })

  it("wakes every subscriber of the same review target", async () => {
    const hub = createConversationHub()
    const subscriptions = Array.from({ length: SUBSCRIBER_COUNT }, () => hub.subscribe(KEY))
    const waits = subscriptions.map(async (subscription) => await subscription.nextChange({ timeoutMs: null, signal: null }))

    hub.publish(KEY)

    await expect(Promise.all(waits)).resolves.toStrictEqual(subscriptions.map(() => "changed"))
    subscriptions.forEach((subscription) => {
      subscription.close()
    })
    await hub.close()
  })

  it("keeps a change that came before the wait, so no change is missed", async () => {
    const hub = createConversationHub()
    const subscription = hub.subscribe(KEY)
    hub.publish(KEY)

    await expect(subscription.nextChange({ timeoutMs: 0, signal: null })).resolves.toBe("changed")
    subscription.close()
    await hub.close()
  })

  it("times out when only another review target changes", async () => {
    const hub = createConversationHub()
    const subscription = hub.subscribe(KEY)
    hub.publish(OTHER_KEY)

    await expect(subscription.nextChange({ timeoutMs: 5, signal: null })).resolves.toBe("timed-out")
    subscription.close()
    await hub.close()
  })

  it("ends a wait when the signal aborts or the subscription closes", async () => {
    const hub = createConversationHub()
    const subscription = hub.subscribe(KEY)
    const leaving = new AbortController()
    const waiting = subscription.nextChange({ timeoutMs: null, signal: leaving.signal })

    leaving.abort()

    await expect(waiting).resolves.toBe("aborted")
    const closing = subscription.nextChange({ timeoutMs: null, signal: null })
    subscription.close()
    await expect(closing).resolves.toBe("aborted")
    await hub.close()
  })
})
