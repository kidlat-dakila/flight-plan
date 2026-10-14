import { buildModelChoice } from "@/procedures/get-model-choice/utils/build-model-choice"
import type { ChatWriter } from "@/procedures/get-model-choice/utils/chat-writer"

const WRITER: ChatWriter["writer"] = {
  install: { agent: "claude", installPath: "/home/.claude", model: "default", effort: "default" },
  effort: "default",
}

describe("buildModelChoice", () => {
  it("offers no choice when the agent offers a single model", () => {
    const chatWriter: ChatWriter = { writer: WRITER, offers: [{ model: "default", label: "Your Claude default", efforts: [] }] }

    expect(buildModelChoice(chatWriter)).toBeNull()
  })
})
