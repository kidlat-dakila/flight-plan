import { chooseModel } from "@/procedures/choose-model"
import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"

describe("chooseModel", () => {
  it("keeps the model the reviewer chose for the agent's next start", async () => {
    const { context, environment } = createConversationContext()

    await expect(chooseModel({ ...KEY, model: "sonnet" }, context)).resolves.toStrictEqual({ kind: "chosen" })

    const { journal } = await environment.store.read(KEY)
    expect(journal.at(0)?.event).toMatchObject({ kind: "model-choice", agent: "claude", model: "sonnet", effort: "default" })
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
