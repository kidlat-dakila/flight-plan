import { deliverToAgent } from "@/procedures/deliver-to-agent"
import { createConversationContext, KEY, reviewerMessage } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { sendAgentMessage } from "@/procedures/send-agent-message"

describe("sendAgentMessage", () => {
  it("shows the message to the reviewer and tells a session the reviewer started how to hear back", async () => {
    const { context, environment } = createConversationContext()

    const sending = await sendAgentMessage({ ...KEY, body: "The walkthrough is ready." }, context)

    expect(sending).toStrictEqual({
      kind: "sent",
      note: "Sent to the reviewer. If you want the reviewer's reply: Run this in the background. It exits when the reviewer replies, and its output holds the reply:\ncurl -sN \"http://localhost:3000/api/storefront/pr-412/live/agent\"",
    })
    const { journal } = await environment.store.read(KEY)
    expect(journal[0]?.event).toMatchObject({ kind: "agent-message", body: "The walkthrough is ready." })
  })

  it("only confirms to a session Flight Plan started, and counts the call as activity", async () => {
    const { context, environment, clock } = createConversationContext()
    await environment.store.append(KEY, [reviewerMessage("m1", "Hi")])
    await deliverToAgent(KEY, context)
    clock.advance(5000)

    await expect(sendAgentMessage({ ...KEY, body: "Done." }, context)).resolves.toStrictEqual({ kind: "sent", note: "Sent to the reviewer." })
    expect(environment.agents.find(KEY)?.lastActivityAt).toStrictEqual(clock.now())
  })

  it("rejects a review target that is not a pull request or branch", async () => {
    const { context } = createConversationContext()

    await expect(sendAgentMessage({ repositoryName: "storefront", targetId: "412", body: "Hi" }, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})
