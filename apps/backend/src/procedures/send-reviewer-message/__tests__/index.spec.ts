import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { pendingInboundOf } from "@/procedures/get-conversation/utils/conversation"
import { sendReviewerMessage } from "@/procedures/send-reviewer-message"

describe("sendReviewerMessage", () => {
  it("keeps the message for the live agent to pick up, and starts no agent", async () => {
    const { context, environment } = createConversationContext()

    const sending = await sendReviewerMessage({ ...KEY, body: "Why the retry?", reference: "storefront@9f2c1ab:src/x.ts#L3-9" }, context)

    expect(sending).toStrictEqual({ kind: "sent", messageId: "id-1" })
    const { journal } = await environment.store.read(KEY)
    expect(pendingInboundOf(journal).map(({ event }) => event)).toMatchObject([
      { kind: "reviewer-message", body: "Why the retry?", reference: "storefront@9f2c1ab:src/x.ts#L3-9" },
    ])
  })

  it("rejects a message for a repository Flight Plan does not follow, and keeps nothing", async () => {
    const { context, environment } = createConversationContext()

    const sending = await sendReviewerMessage({ repositoryName: "billing", targetId: "pr-1", body: "Hi", reference: null }, context)

    expect(sending).toStrictEqual({ kind: "rejected", message: "Flight Plan has no repository named \"billing\". It follows: storefront." })
    await expect(environment.store.read({ repositoryName: "billing", targetId: "pr-1" })).resolves.toMatchObject({ journal: [] })
  })
})
