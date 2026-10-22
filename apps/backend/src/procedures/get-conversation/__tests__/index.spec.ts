import { getConversation } from "@/procedures/get-conversation"
import { createConversationContext, KEY, reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { ONLINE_WINDOW_MS } from "@/procedures/get-conversation/utils/agent-presence"

describe("getConversation", () => {
  it("builds the conversation of a review target with the agent's state", async () => {
    const { context, environment } = createConversationContext()
    await environment.store.append(KEY, [reviewerMessage("m1", "Hi")])
    environment.presence.openStream(KEY)

    await expect(getConversation(KEY, context)).resolves.toMatchObject({
      agentState: "online",
      agentStateLabel: "Agent online",
      entries: [{ kind: "message", id: "m1" }],
    })
  })
})

describe("getConversation offline", () => {
  it("says the agent is offline once nothing was heard from it within the window", async () => {
    const { context, environment, clock } = createConversationContext()
    environment.presence.markSeen(KEY, clock.now())
    clock.advance(ONLINE_WINDOW_MS + 1)

    await expect(getConversation(KEY, context)).resolves.toMatchObject({ agentState: "offline", agentStateLabel: "Agent offline" })
  })
})
