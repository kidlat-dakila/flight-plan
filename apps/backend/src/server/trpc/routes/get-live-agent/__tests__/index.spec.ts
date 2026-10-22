import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appRouter } from "@/server/trpc/router"

describe("review.liveAgent route", () => {
  it("delegates to the get-live-agent procedure", async () => {
    const { context } = createConversationContext()

    await expect(appRouter.createCaller(context).review.liveAgent(KEY)).resolves.toMatchObject({ kind: "live", isOnline: false })
  })
})
