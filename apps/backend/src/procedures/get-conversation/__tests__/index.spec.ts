import { getConversation } from "@/procedures/get-conversation"
import { createConversationContext, KEY, reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"

describe("getConversation", () => {
  it("builds the conversation of a review target with the agent's state", async () => {
    const { context, environment } = createConversationContext()
    await environment.store.append(KEY, [reviewerMessage("m1", "Hi")])
    environment.agents.openListener(KEY)

    await expect(getConversation(KEY, context)).resolves.toMatchObject({
      agentState: "listening",
      agentStateLabel: "Agent listening",
      entries: [{ kind: "message", id: "m1" }],
    })
  })
})
