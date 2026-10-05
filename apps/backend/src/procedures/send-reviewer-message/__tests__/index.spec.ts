import { createConversationContext, KEY, SERVER_URL } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { sendReviewerMessage } from "@/procedures/send-reviewer-message"

describe("sendReviewerMessage", () => {
  it("keeps the message and starts Claude in the repository folder with it as the prompt", async () => {
    const { context, spawner, environment } = createConversationContext()

    const sending = await sendReviewerMessage({ ...KEY, body: "Why the retry?", reference: "storefront@9f2c1ab:src/x.ts#L3-9" }, context)

    expect(sending).toStrictEqual({ kind: "sent", messageId: "id-1" })
    expect(spawner.launches).toHaveLength(1)
    expect(spawner.launches[0]).toMatchObject({
      agent: "claude",
      installPath: "/Users/dev/.claude",
      sessionId: "id-2",
      isResume: false,
      workingPath: "/Users/dev/projects/storefront",
      model: "opus",
      prompt: "The reviewer wrote about storefront@9f2c1ab:src/x.ts#L3-9:\nWhy the retry?",
    })
    expect(spawner.launches[0]?.instructions).toContain("targetId \"pr-412\"")
    expect(environment.agents.find(KEY)).toMatchObject({ phase: "starting", sessionId: "id-2" })
    const { journal } = await environment.store.read(KEY)
    expect(journal.map(({ event }) => event.kind)).toStrictEqual(["reviewer-message", "delivery"])
    expect(SERVER_URL).toBe(environment.serverUrl)
  })

  it("does not start a second agent while one is working on the review target", async () => {
    const { context, spawner } = createConversationContext()

    await sendReviewerMessage({ ...KEY, body: "First", reference: null }, context)
    await sendReviewerMessage({ ...KEY, body: "Second", reference: null }, context)

    expect(spawner.launches).toHaveLength(1)
  })

  it("rejects a message for a repository Flight Plan does not follow, and keeps nothing", async () => {
    const { context, spawner, environment } = createConversationContext()

    const sending = await sendReviewerMessage({ repositoryName: "billing", targetId: "pr-1", body: "Hi", reference: null }, context)

    expect(sending).toStrictEqual({ kind: "rejected", message: "Flight Plan has no repository named \"billing\". It follows: storefront." })
    expect(spawner.launches).toStrictEqual([])
    await expect(environment.store.read({ repositoryName: "billing", targetId: "pr-1" })).resolves.toMatchObject({ journal: [] })
  })
})
