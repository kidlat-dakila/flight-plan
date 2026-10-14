import type { AgentOffer } from "@/procedures/get-review/utils/start/agent-offers"
import { shippedConfigurationOf } from "@/procedures/list-configurations/utils/configuration"
import { planReviewRequest } from "@/procedures/request-review/utils/plan-review-request"
import type { RequestReviewInput } from "@/procedures/request-review/utils/schemas"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const DEFAULT_EFFORT_OFFER = { effort: "default", label: "Default" }

const claude: AgentOffer = {
  agent: "claude",
  label: "Claude",
  unavailableReason: null,
  models: [
    { model: "default", label: "Default (recommended)", efforts: [DEFAULT_EFFORT_OFFER, { effort: "high", label: "High" }] },
    { model: "opus", label: "Opus 5.5", efforts: [DEFAULT_EFFORT_OFFER, { effort: "high", label: "High" }] },
    { model: "haiku", label: "Haiku 4.5", efforts: [DEFAULT_EFFORT_OFFER] },
  ],
  model: "default",
  effort: "default",
  preferredEffort: "default",
}

const codex: AgentOffer = {
  agent: "codex",
  label: "Codex",
  unavailableReason: "Flight Plan cannot start Codex yet. Prompt it yourself instead.",
  models: [{ model: "default", label: "Your Codex default", efforts: [DEFAULT_EFFORT_OFFER] }],
  model: "default",
  effort: "default",
  preferredEffort: "default",
}

const STANDARD = shippedConfigurationOf("standard")

const createInput = (overrides: Partial<RequestReviewInput> = {}): RequestReviewInput => ({
  repositoryName: "storefront",
  targetId: "pr-416",
  configurationId: "standard",
  order: "risk-first",
  customOrder: "",
  writer: { kind: "manual" },
  ...overrides,
})

describe("planReviewRequest", () => {
  it("plans the request with the time it was made", () => {
    expect(planReviewRequest(createInput(), STANDARD, [], NOW)).toStrictEqual({
      kind: "planned",
      configuration: STANDARD,
      request: {
        configurationId: "standard",
        preset: "standard",
        order: "risk-first",
        customOrder: null,
        writer: { kind: "manual" },
        requestedAt: NOW,
      },
    })
  })

  it("records a configuration of the user's own with the preset it is based on", () => {
    const shortReviews = { ...shippedConfigurationOf("minimal"), id: "short-reviews", name: "Short reviews", isPreset: false }

    expect(planReviewRequest(createInput({ configurationId: "short-reviews" }), shortReviews, [], NOW)).toMatchObject({
      request: { configurationId: "short-reviews", preset: "minimal" },
    })
  })

  it("rejects a configuration that no longer exists", () => {
    expect(planReviewRequest(createInput({ configurationId: "gone" }), null, [], NOW)).toStrictEqual({
      kind: "rejected",
      field: "configuration",
      message: "This configuration no longer exists. Pick another one.",
    })
  })

  it("keeps the trimmed instruction of a custom order, and drops it for any other order", () => {
    expect(planReviewRequest(createInput({ order: "custom", customOrder: "  Tests first.  " }), STANDARD, [], NOW)).toMatchObject({
      request: { order: "custom", customOrder: "Tests first." },
    })
    expect(planReviewRequest(createInput({ customOrder: "Tests first." }), STANDARD, [], NOW)).toMatchObject({
      request: { order: "risk-first", customOrder: null },
    })
  })

  it("rejects a custom order without an instruction", () => {
    expect(planReviewRequest(createInput({ order: "custom", customOrder: "   " }), STANDARD, [], NOW)).toStrictEqual({
      kind: "rejected",
      field: "customOrder",
      message: "Write how the agent orders the Code Walkthrough.",
    })
  })

  it("accepts an agent Flight Plan can start with a model it offers", () => {
    const writer = { kind: "agent", agent: "claude", model: "opus", effort: "high" } as const

    expect(planReviewRequest(createInput({ writer }), STANDARD, [claude, codex], NOW)).toMatchObject({ kind: "planned", request: { writer } })
  })

  it("rejects an effort the chosen model does not offer", () => {
    const unknownEffort = { kind: "agent", agent: "claude", model: "opus", effort: "extreme" } as const
    const otherModelsEffort = { kind: "agent", agent: "claude", model: "haiku", effort: "high" } as const

    expect(planReviewRequest(createInput({ writer: unknownEffort }), STANDARD, [claude], NOW)).toStrictEqual({
      kind: "rejected",
      field: "effort",
      message: "Opus 5.5 does not offer this effort.",
    })
    expect(planReviewRequest(createInput({ writer: otherModelsEffort }), STANDARD, [claude], NOW)).toStrictEqual({
      kind: "rejected",
      field: "effort",
      message: "Haiku 4.5 does not offer this effort.",
    })
  })

  it("rejects an agent that is not set up, one that cannot be started and a model the agent does not offer", () => {
    const claudeWith = (model: string) =>
      createInput({ writer: { kind: "agent", agent: "claude", model, effort: "default" } })
    const codexRequest = createInput({ writer: { kind: "agent", agent: "codex", model: "default", effort: "default" } })

    expect(planReviewRequest(claudeWith("default"), STANDARD, [], NOW)).toMatchObject({
      kind: "rejected",
      field: "writer",
      message: "This agent is not set up in Flight Plan.",
    })
    expect(planReviewRequest(codexRequest, STANDARD, [claude, codex], NOW)).toMatchObject({
      kind: "rejected",
      field: "writer",
      message: "Flight Plan cannot start Codex yet. Prompt it yourself instead.",
    })
    expect(planReviewRequest(claudeWith("gpt"), STANDARD, [claude], NOW)).toMatchObject({
      kind: "rejected",
      field: "model",
      message: "Claude does not offer this model.",
    })
  })

  it("asks for a review target before anything else", () => {
    expect(planReviewRequest(createInput({ targetId: " ", order: "custom" }), STANDARD, [claude], NOW)).toStrictEqual({
      kind: "rejected",
      field: "target",
      message: "Choose a pull request or a branch.",
    })
  })

  it("plans a request the author writes without asking any agent", () => {
    const writer = { kind: "author", start: "empty" } as const

    expect(planReviewRequest(createInput({ writer }), STANDARD, [], NOW)).toMatchObject({ kind: "planned", request: { writer } })
  })
})
