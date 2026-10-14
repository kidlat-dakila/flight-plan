import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import { getModelChoice } from "@/procedures/get-model-choice"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"

describe("getModelChoice", () => {
  it("offers the models Claude lists, with the setup's model chosen", async () => {
    const { context } = createConversationContext()

    await expect(getModelChoice(KEY, context)).resolves.toStrictEqual({
      label: "Model for Claude",
      hint: "The agent uses it from its next turn.",
      selectedModel: "opus",
      options: [
        { value: "default", label: "Default (recommended)" },
        { value: "opus", label: "Opus" },
        { value: "sonnet", label: "Sonnet" },
        { value: "haiku", label: "Haiku" },
      ],
    })
  })

  it("shows the model the reviewer chose last in the chat", async () => {
    const { context } = createConversationContext()
    await appendAndPublish(
      KEY,
      [{ kind: "model-choice", id: "c1", agent: "claude", model: "haiku", effort: "default", chosenAt: context.now() }],
      context,
    )

    await expect(getModelChoice(KEY, context)).resolves.toMatchObject({ selectedModel: "haiku" })
  })

  it("offers nothing when no agent Flight Plan can start is set up", async () => {
    const { context } = createConversationContext({ setup: EMPTY_SETUP })

    await expect(getModelChoice(KEY, context)).resolves.toBeNull()
  })
})
