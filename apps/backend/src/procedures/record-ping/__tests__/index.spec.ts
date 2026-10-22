import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { isAgentOnlineFor } from "@/procedures/get-conversation/utils/conversation-actions"
import { recordPing } from "@/procedures/record-ping"

describe("recordPing", () => {
  it("shows the agent as online for the review", async () => {
    const { context } = createConversationContext()

    await expect(recordPing(KEY, context)).resolves.toStrictEqual({
      kind: "recorded",
      note: "Flight Plan shows the reviewer that you are online. The review's listen command:\ncurl -sN \"http://localhost:3000/api/storefront/pr-412/live/agent\"",
    })
    expect(isAgentOnlineFor(KEY, context)).toBe(true)
  })

  it("wakes the review's watchers when the agent comes back online", async () => {
    const { context, environment } = createConversationContext()
    const subscription = environment.hub.subscribe(KEY)

    await recordPing(KEY, context)

    await expect(subscription.nextChange({ timeoutMs: 0, signal: null })).resolves.toBe("changed")
    subscription.close()
  })

  it("rejects a repository Flight Plan does not follow", async () => {
    const { context } = createConversationContext()

    await expect(recordPing({ repositoryName: "billing", targetId: "pr-1" }, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})
