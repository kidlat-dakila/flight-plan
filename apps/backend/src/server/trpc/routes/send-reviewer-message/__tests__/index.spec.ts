import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { MAX_EXCERPT_LENGTH } from "@/procedures/send-reviewer-message/utils/schemas"
import { appRouter } from "@/server/trpc/router"

describe("conversation.sendMessage route", () => {
  it("delegates to the send-reviewer-message procedure and returns a rejection as data", async () => {
    const caller = appRouter.createCaller(createConversationContext().context)

    await expect(caller.conversation.sendMessage({ ...KEY, body: "Why?", reference: null, excerpt: null })).resolves.toStrictEqual({ kind: "sent", messageId: "id-1" })
    await expect(caller.conversation.sendMessage({ repositoryName: "billing", targetId: "pr-1", body: "Hi", reference: null, excerpt: null })).resolves.toMatchObject({
      kind: "rejected",
    })
  })

  it("rejects a blank message", async () => {
    const caller = appRouter.createCaller(createConversationContext().context)

    await expect(caller.conversation.sendMessage({ ...KEY, body: "   ", reference: null, excerpt: null })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })

  it("rejects an excerpt over the limit", async () => {
    const caller = appRouter.createCaller(createConversationContext().context)
    const excerpt = { kind: "text", text: "a".repeat(MAX_EXCERPT_LENGTH + 1) } as const

    await expect(caller.conversation.sendMessage({ ...KEY, body: "Why?", reference: null, excerpt })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
