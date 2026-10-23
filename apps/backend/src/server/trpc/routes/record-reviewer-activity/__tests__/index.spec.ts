import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appRouter } from "@/server/trpc/router"

describe("review.recordActivity route", () => {
  it("delegates to the record-reviewer-activity procedure", async () => {
    const { context } = createConversationContext()

    await expect(appRouter.createCaller(context).review.recordActivity(KEY)).resolves.toStrictEqual({ kind: "recorded" })
  })
})
