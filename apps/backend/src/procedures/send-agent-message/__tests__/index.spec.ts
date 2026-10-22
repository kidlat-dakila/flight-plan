import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { sendAgentMessage } from "@/procedures/send-agent-message"

describe("sendAgentMessage", () => {
  it("shows the message to the reviewer and tells the agent how to hear back", async () => {
    const { context, environment } = createConversationContext()

    const sending = await sendAgentMessage({ ...KEY, body: "The walkthrough is ready." }, context)

    expect(sending).toStrictEqual({
      kind: "sent",
      note: "Sent to the reviewer. The reviewer's reply comes on your listening stream. If you are not listening yet, run this in the foreground. It exits when the reviewer replies, and its output holds the reply:\ncurl -sN \"http://localhost:3000/api/storefront/pr-412/live/agent\"",
    })
    const { journal } = await environment.store.read(KEY)
    expect(journal[0]?.event).toMatchObject({ kind: "agent-message", body: "The walkthrough is ready." })
  })

  it("counts the call as a sign that the agent is online", async () => {
    const { context, environment, clock } = createConversationContext()
    clock.advance(5000)

    await sendAgentMessage({ ...KEY, body: "Done." }, context)

    expect(environment.presence.presenceOf(KEY).lastSeenAt).toStrictEqual(clock.now())
  })

  it("rejects a review target that is not a pull request or branch", async () => {
    const { context } = createConversationContext()

    await expect(sendAgentMessage({ repositoryName: "storefront", targetId: "412", body: "Hi" }, context)).resolves.toMatchObject({ kind: "rejected" })
  })
})
