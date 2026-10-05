import { chooseWriter } from "@/procedures/deliver-to-agent/utils/choose-writer"
import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import type { AgentInstall } from "@/procedures/get-setup/utils/setup"

const INSTALL: AgentInstall = { agent: "claude", installPath: "/home/.claude", model: "sonnet" }

const createRequest = (writer: ReviewRequest["writer"]): ReviewRequest => ({
  preset: "standard",
  order: "risk-first",
  customOrder: null,
  writer,
  requestedAt: new Date("2026-10-01T12:00:00.000Z"),
})

describe("chooseWriter", () => {
  it("runs the model and the effort the reviewer chose for this review", () => {
    const request = createRequest({ kind: "agent", agent: "claude", model: "opus", effort: "high" })

    expect(chooseWriter(INSTALL, request)).toStrictEqual({ install: { ...INSTALL, model: "opus" }, effort: "high" })
  })

  it("keeps the setup's model when the review has no request, a manual one or one for another agent", () => {
    const fromSetup = { install: INSTALL, effort: "default" }

    expect(chooseWriter(INSTALL, null)).toStrictEqual(fromSetup)
    expect(chooseWriter(INSTALL, createRequest({ kind: "manual" }))).toStrictEqual(fromSetup)
    expect(chooseWriter(INSTALL, createRequest({ kind: "agent", agent: "codex", model: "default", effort: "high" }))).toStrictEqual(fromSetup)
  })
})
