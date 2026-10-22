import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appRouter } from "@/server/trpc/router"

describe("conversation.get route", () => {
  it("delegates to the get-conversation procedure", async () => {
    const caller = appRouter.createCaller(createConversationContext().context)

    await expect(caller.conversation.get(KEY)).resolves.toMatchObject({ agentState: "offline", entries: [] })
  })

  it("rejects an empty review target", async () => {
    const caller = appRouter.createCaller(createConversationContext().context)

    await expect(caller.conversation.get({ repositoryName: "", targetId: "pr-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
