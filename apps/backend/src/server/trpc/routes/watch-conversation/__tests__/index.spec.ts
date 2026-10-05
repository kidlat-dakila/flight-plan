import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appRouter } from "@/server/trpc/router"

describe("conversation.watch route", () => {
  it("streams the conversation from the watch-conversation procedure", async () => {
    const caller = appRouter.createCaller(createConversationContext().context)

    const views = await caller.conversation.watch(KEY)
    const iterator = views[Symbol.asyncIterator]()

    await expect(iterator.next()).resolves.toMatchObject({ value: { agentState: "not-running" } })
    await iterator.return?.()
  })
})
