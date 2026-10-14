import { planModelChoice } from "@/procedures/choose-model/utils/plan-model-choice"
import type { ChatWriter } from "@/procedures/get-model-choice/utils/chat-writer"

const CHAT_WRITER: ChatWriter = {
  writer: { install: { agent: "claude", installPath: "/home/.claude", model: "opus", effort: "high" }, effort: "high" },
  offers: [
    { model: "opus", label: "Opus", efforts: [{ effort: "default", label: "Default" }, { effort: "high", label: "High" }] },
    { model: "haiku", label: "Haiku", efforts: [{ effort: "default", label: "Default" }] },
  ],
}

describe("planModelChoice", () => {
  it("keeps the effort the agent runs at when the chosen model offers it", () => {
    expect(planModelChoice(CHAT_WRITER, "opus")).toStrictEqual({ kind: "chosen", agent: "claude", model: "opus", effort: "high" })
  })

  it("falls back to the default effort when the chosen model does not offer it", () => {
    expect(planModelChoice(CHAT_WRITER, "haiku")).toStrictEqual({ kind: "chosen", agent: "claude", model: "haiku", effort: "default" })
  })

  it("refuses a choice when no agent can be started", () => {
    expect(planModelChoice(null, "opus")).toMatchObject({ kind: "rejected" })
  })
})
