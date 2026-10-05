import { defaultWriterKeyOf, effortLabelOf, modelLabelOf, offerAgents } from "@/procedures/get-review/utils/start/agent-offers"
import type { AgentsChoice } from "@/procedures/get-setup/utils/setup"

const createAgents = (overrides: Partial<AgentsChoice> = {}): AgentsChoice => ({
  installs: [
    { agent: "codex", installPath: "/home/.codex", model: "default" },
    { agent: "claude", installPath: "/home/.claude", model: "opus" },
  ],
  defaultAgent: "claude",
  connection: "direct",
  ...overrides,
})

describe("offerAgents", () => {
  it("offers every installed agent with its models and the model chosen in setup", () => {
    expect(offerAgents(createAgents(), ["claude", "codex"])).toMatchObject([
      { agent: "codex", label: "Codex", unavailableReason: null, model: "default", models: [{ model: "default" }] },
      {
        agent: "claude",
        label: "Claude",
        unavailableReason: null,
        model: "opus",
        effort: "default",
        efforts: [{ effort: "default" }, { effort: "low" }, { effort: "medium" }, { effort: "high" }, { effort: "max" }],
      },
    ])
  })

  it("says why an agent Flight Plan cannot start is unavailable", () => {
    expect(offerAgents(createAgents(), ["claude"])).toMatchObject([
      { agent: "codex", unavailableReason: "Flight Plan cannot start Codex yet. Prompt it yourself instead." },
      { agent: "claude", unavailableReason: null },
    ])
  })

  it("offers no agent before the agents step of setup is saved", () => {
    expect(offerAgents(null, ["claude"])).toStrictEqual([])
  })
})

describe("defaultWriterKeyOf", () => {
  it("picks the default agent of setup when Flight Plan can start it", () => {
    const agents = createAgents()

    expect(defaultWriterKeyOf(agents, offerAgents(agents, ["claude", "codex"]))).toBe("claude")
  })

  it("picks the first agent Flight Plan can start when it cannot start the default one", () => {
    const agents = createAgents()

    expect(defaultWriterKeyOf(agents, offerAgents(agents, ["codex"]))).toBe("codex")
  })

  it("picks prompting by hand when setup chose it, when no agent can be started and when none is set up", () => {
    const manual = createAgents({ connection: "manual" })
    const direct = createAgents()

    expect(defaultWriterKeyOf(manual, offerAgents(manual, ["claude"]))).toBe("manual")
    expect(defaultWriterKeyOf(direct, offerAgents(direct, []))).toBe("manual")
    expect(defaultWriterKeyOf(null, [])).toBe("manual")
  })
})

describe("effortLabelOf", () => {
  it("names an effort the agent offers, and has no name for the agent's default", () => {
    expect(effortLabelOf("claude", "high")).toBe("High")
    expect(effortLabelOf("claude", "default")).toBeNull()
    expect(effortLabelOf("claude", "retired-effort")).toBe("retired-effort")
  })
})

describe("modelLabelOf", () => {
  it("names a model the agent offers, and falls back to the stored value", () => {
    expect(modelLabelOf("claude", "default")).toBe("Your Claude default")
    expect(modelLabelOf("claude", "retired-model")).toBe("retired-model")
  })
})
