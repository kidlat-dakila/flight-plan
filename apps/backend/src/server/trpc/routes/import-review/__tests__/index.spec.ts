import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appRouter } from "@/server/trpc/router"

describe("review.import route", () => {
  it("delegates to the import-review procedure", async () => {
    const { context, spawner } = createConversationContext()

    const started = await appRouter.createCaller(context).review.import({ ...KEY, artifactUrl: "https://claude.ai/artifact/abc" })

    expect(started.importId).not.toBeNull()
    expect(spawner.launches).toHaveLength(1)
  })

  it("returns a refusal as a message, not an error", async () => {
    const { context } = createConversationContext()

    await expect(appRouter.createCaller(context).review.import({ ...KEY, artifactUrl: "https://example.com" })).resolves.toMatchObject({ importId: null })
  })
})
