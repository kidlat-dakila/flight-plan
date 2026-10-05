import type { AgentOffer } from "@/procedures/get-review/utils/start/agent-offers"
import { planReviewRequest } from "@/procedures/request-review/utils/plan-review-request"
import type { RequestReviewInput } from "@/procedures/request-review/utils/schemas"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const claude: AgentOffer = {
  agent: "claude",
  label: "Claude",
  unavailableReason: null,
  models: [{ model: "default", label: "Your Claude default" }, { model: "opus", label: "Opus" }],
  model: "default",
  efforts: [{ effort: "default", label: "Default" }, { effort: "high", label: "High" }],
  effort: "default",
}

const codex: AgentOffer = {
  agent: "codex",
  label: "Codex",
  unavailableReason: "Flight Plan cannot start Codex yet. Prompt it yourself instead.",
  models: [{ model: "default", label: "Your Codex default" }],
  model: "default",
  efforts: [{ effort: "default", label: "Default" }],
  effort: "default",
}

const createInput = (overrides: Partial<RequestReviewInput> = {}): RequestReviewInput => ({
  repositoryName: "storefront",
  targetId: "pr-416",
  preset: "standard",
  order: "risk-first",
  customOrder: "",
  writer: { kind: "manual" },
  ...overrides,
})

describe("planReviewRequest", () => {
  it("plans the request with the time it was made", () => {
    expect(planReviewRequest(createInput(), [], NOW)).toStrictEqual({
      kind: "planned",
      request: { preset: "standard", order: "risk-first", customOrder: null, writer: { kind: "manual" }, requestedAt: NOW },
    })
  })

  it("keeps the trimmed instruction of a custom order, and drops it for any other order", () => {
    expect(planReviewRequest(createInput({ order: "custom", customOrder: "  Tests first.  " }), [], NOW)).toMatchObject({
      request: { order: "custom", customOrder: "Tests first." },
    })
    expect(planReviewRequest(createInput({ customOrder: "Tests first." }), [], NOW)).toMatchObject({
      request: { order: "risk-first", customOrder: null },
    })
  })

  it("rejects a custom order without an instruction", () => {
    expect(planReviewRequest(createInput({ order: "custom", customOrder: "   " }), [], NOW)).toStrictEqual({
      kind: "rejected",
      field: "customOrder",
      message: "Write how the agent orders the Code Walkthrough.",
    })
  })

  it("accepts an agent Flight Plan can start with a model it offers", () => {
    const writer = { kind: "agent", agent: "claude", model: "opus", effort: "high" } as const

    expect(planReviewRequest(createInput({ writer }), [claude, codex], NOW)).toMatchObject({ kind: "planned", request: { writer } })
  })

  it("rejects an effort the agent does not offer", () => {
    const writer = { kind: "agent", agent: "claude", model: "opus", effort: "extreme" } as const

    expect(planReviewRequest(createInput({ writer }), [claude], NOW)).toStrictEqual({
      kind: "rejected",
      field: "effort",
      message: "Claude does not offer this effort.",
    })
  })

  it("rejects an agent that is not set up, one that cannot be started and a model the agent does not offer", () => {
    const claudeWith = (model: string) =>
      createInput({ writer: { kind: "agent", agent: "claude", model, effort: "default" } })
    const codexRequest = createInput({ writer: { kind: "agent", agent: "codex", model: "default", effort: "default" } })

    expect(planReviewRequest(claudeWith("default"), [], NOW)).toMatchObject({
      kind: "rejected",
      field: "writer",
      message: "This agent is not set up in Flight Plan.",
    })
    expect(planReviewRequest(codexRequest, [claude, codex], NOW)).toMatchObject({
      kind: "rejected",
      field: "writer",
      message: "Flight Plan cannot start Codex yet. Prompt it yourself instead.",
    })
    expect(planReviewRequest(claudeWith("gpt"), [claude], NOW)).toMatchObject({
      kind: "rejected",
      field: "model",
      message: "Claude does not offer this model.",
    })
  })
})
