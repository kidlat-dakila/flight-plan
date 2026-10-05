import { defaultWriterKeyOf, offerAgents } from "@/procedures/get-review/utils/start/agent-offers"
import type { AgentModels } from "@/procedures/get-setup/utils/agent-models"
import type { AgentsChoice } from "@/procedures/get-setup/utils/setup"

const AGENT_MODELS: AgentModels = {
  claude: [
    { model: "default", label: "Default (recommended)", efforts: ["low", "xhigh"] },
    { model: "opus", label: "Opus 5.5", efforts: ["low", "xhigh"] },
    { model: "haiku", label: "Haiku 4.5", efforts: [] },
  ],
}

const createAgents = (overrides: Partial<AgentsChoice> = {}): AgentsChoice => ({
  installs: [
    { agent: "codex", installPath: "/home/.codex", model: "default", effort: "default" },
    { agent: "claude", installPath: "/home/.claude", model: "opus", effort: "default" },
  ],
  defaultAgent: "claude",
  connection: "direct",
  ...overrides,
})

describe("offerAgents", () => {
  it("offers every installed agent with the models it lists and the model chosen in setup", () => {
    expect(offerAgents(createAgents(), ["claude", "codex"], AGENT_MODELS)).toMatchObject([
      {
        agent: "codex",
        label: "Codex",
        unavailableReason: null,
        model: "default",
        models: [{ model: "default", label: "Your Codex default", efforts: [{ effort: "default" }] }],
      },
      {
        agent: "claude",
        label: "Claude",
        unavailableReason: null,
        model: "opus",
        effort: "default",
        models: [
          { model: "default", label: "Default (recommended)" },
          {
            model: "opus",
            label: "Opus 5.5",
            efforts: [
              { effort: "default", label: "Default" },
              { effort: "low", label: "Low" },
              { effort: "xhigh", label: "Extra high" },
            ],
          },
          { model: "haiku", efforts: [{ effort: "default" }] },
        ],
      },
    ])
  })

  it("starts from the effort chosen in setup when the chosen model offers it", () => {
    const withEffort = (model: string) =>
      createAgents({ installs: [{ agent: "claude", installPath: "/home/.claude", model, effort: "xhigh" }] })

    expect(offerAgents(withEffort("opus"), ["claude"], AGENT_MODELS)).toMatchObject([
      { effort: "xhigh", preferredEffort: "xhigh" },
    ])
    expect(offerAgents(withEffort("haiku"), ["claude"], AGENT_MODELS)).toMatchObject([
      { effort: "default", preferredEffort: "xhigh" },
    ])
  })

  it("keeps the model chosen in setup on offer when the agent no longer lists it", () => {
    const agents = createAgents({ installs: [{ agent: "claude", installPath: "/home/.claude", model: "retired-model", effort: "default" }] })

    expect(offerAgents(agents, ["claude"], AGENT_MODELS)).toMatchObject([
      { model: "retired-model", models: [{}, {}, {}, { model: "retired-model", label: "retired-model" }] },
    ])
  })

  it("says why an agent Flight Plan cannot start is unavailable", () => {
    expect(offerAgents(createAgents(), ["claude"], AGENT_MODELS)).toMatchObject([
      { agent: "codex", unavailableReason: "Flight Plan cannot start Codex yet. Prompt it yourself instead." },
      { agent: "claude", unavailableReason: null },
    ])
  })

  it("offers no agent before the agents step of setup is saved", () => {
    expect(offerAgents(null, ["claude"], AGENT_MODELS)).toStrictEqual([])
  })
})

describe("defaultWriterKeyOf", () => {
  it("picks the default agent of setup when Flight Plan can start it", () => {
    const agents = createAgents()

    expect(defaultWriterKeyOf(agents, offerAgents(agents, ["claude", "codex"], AGENT_MODELS))).toBe("claude")
  })

  it("picks the first agent Flight Plan can start when it cannot start the default one", () => {
    const agents = createAgents()

    expect(defaultWriterKeyOf(agents, offerAgents(agents, ["codex"], AGENT_MODELS))).toBe("codex")
  })

  it("picks prompting by hand when setup chose it, when no agent can be started and when none is set up", () => {
    const manual = createAgents({ connection: "manual" })
    const direct = createAgents()

    expect(defaultWriterKeyOf(manual, offerAgents(manual, ["claude"], AGENT_MODELS))).toBe("manual")
    expect(defaultWriterKeyOf(direct, offerAgents(direct, [], AGENT_MODELS))).toBe("manual")
    expect(defaultWriterKeyOf(null, [])).toBe("manual")
  })
})
