import { chooseModel } from "@/procedures/choose-model"
import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { sendReviewerMessage } from "@/procedures/send-reviewer-message"

describe("chooseModel", () => {
  it("keeps the model the reviewer chose, and starts the agent's next turn with it", async () => {
    const { context, spawner, environment } = createConversationContext()

    await expect(chooseModel({ ...KEY, model: "sonnet" }, context)).resolves.toStrictEqual({ kind: "chosen" })
    await sendReviewerMessage({ ...KEY, body: "Why the retry?", reference: null }, context)

    const { journal } = await environment.store.read(KEY)
    expect(journal.at(0)?.event).toMatchObject({ kind: "model-choice", agent: "claude", model: "sonnet", effort: "default" })
    expect(spawner.launches[0]).toMatchObject({ model: "sonnet", effort: "default" })
  })

  it("refuses a model the agent does not offer, and keeps nothing", async () => {
    const { context, environment } = createConversationContext()

    await expect(chooseModel({ ...KEY, model: "gpt-5" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Claude does not offer the model \"gpt-5\".",
    })
    await expect(environment.store.read(KEY)).resolves.toMatchObject({ journal: [] })
  })
})
