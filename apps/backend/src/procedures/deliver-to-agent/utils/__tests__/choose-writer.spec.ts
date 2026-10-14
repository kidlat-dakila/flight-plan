import { chooseWriter } from "@/procedures/deliver-to-agent/utils/choose-writer"
import type { ModelChoice } from "@/procedures/get-conversation/utils/conversation"
import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import type { AgentInstall } from "@/procedures/get-setup/utils/setup"

const INSTALL: AgentInstall = { agent: "claude", installPath: "/home/.claude", model: "sonnet", effort: "low" }

const createRequest = (writer: ReviewRequest["writer"]): ReviewRequest => ({
  preset: "standard",
  order: "risk-first",
  customOrder: null,
  writer,
  requestedAt: new Date("2026-10-01T12:00:00.000Z"),
})

const createChoice = (agent: ModelChoice["agent"]): ModelChoice => ({
  kind: "model-choice",
  id: "choice-1",
  agent,
  model: "haiku",
  effort: "default",
  chosenAt: new Date("2026-10-02T12:00:00.000Z"),
})

describe("chooseWriter", () => {
  it("runs the model and the effort the reviewer chose for this review", () => {
    const request = createRequest({ kind: "agent", agent: "claude", model: "opus", effort: "high" })

    expect(chooseWriter(INSTALL, request, null)).toStrictEqual({ install: { ...INSTALL, model: "opus" }, effort: "high" })
  })

  it("keeps the setup's model and effort when the review has no request, a manual one or one for another agent", () => {
    const fromSetup = { install: INSTALL, effort: "low" }

    expect(chooseWriter(INSTALL, null, null)).toStrictEqual(fromSetup)
    expect(chooseWriter(INSTALL, createRequest({ kind: "manual" }), null)).toStrictEqual(fromSetup)
    expect(chooseWriter(INSTALL, createRequest({ kind: "agent", agent: "codex", model: "default", effort: "high" }), null)).toStrictEqual(fromSetup)
  })

  it("runs the model the reviewer chose in the chat over the one of the review request", () => {
    const request = createRequest({ kind: "agent", agent: "claude", model: "opus", effort: "high" })

    expect(chooseWriter(INSTALL, request, createChoice("claude"))).toStrictEqual({
      install: { ...INSTALL, model: "haiku" },
      effort: "default",
    })
  })

  it("ignores a choice made in the chat for another agent", () => {
    expect(chooseWriter(INSTALL, null, createChoice("codex"))).toStrictEqual({ install: INSTALL, effort: "low" })
  })
})
