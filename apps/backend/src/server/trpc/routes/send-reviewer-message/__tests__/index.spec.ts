import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appRouter } from "@/server/trpc/router"

describe("conversation.sendMessage route", () => {
  it("delegates to the send-reviewer-message procedure and returns a rejection as data", async () => {
    const caller = appRouter.createCaller(createConversationContext().context)

    await expect(caller.conversation.sendMessage({ ...KEY, body: "Why?", reference: null })).resolves.toStrictEqual({ kind: "sent", messageId: "id-1" })
    await expect(caller.conversation.sendMessage({ repositoryName: "billing", targetId: "pr-1", body: "Hi", reference: null })).resolves.toMatchObject({
      kind: "rejected",
    })
  })

  it("rejects a blank message", async () => {
    const caller = appRouter.createCaller(createConversationContext().context)

    await expect(caller.conversation.sendMessage({ ...KEY, body: "   ", reference: null })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
