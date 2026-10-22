import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appRouter } from "@/server/trpc/router"

describe("review.openAgentTerminal route", () => {
  it("returns a refusal as data, not an error", async () => {
    const { context } = createConversationContext()

    await expect(appRouter.createCaller(context).review.openAgentTerminal(KEY)).resolves.toMatchObject({ kind: "rejected" })
  })
})
