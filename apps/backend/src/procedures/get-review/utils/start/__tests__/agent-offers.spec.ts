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
  ...overrides,
})

describe("offerAgents", () => {
  it("offers every installed agent with the models it lists and the model chosen in setup", () => {
    expect(offerAgents(createAgents(), ["claude", "codex"], AGENT_MODELS)).toMatchObject([
      {
        agent: "codex",
        label: "Codex",
        isStartable: true,
        model: "default",
        models: [{ model: "default", label: "Your Codex default", efforts: [{ effort: "default" }] }],
      },
      {
        agent: "claude",
        label: "Claude",
        isStartable: true,
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

  it("marks an agent Flight Plan cannot start, which the reviewer then starts", () => {
    expect(offerAgents(createAgents(), ["claude"], AGENT_MODELS)).toMatchObject([
      { agent: "codex", isStartable: false },
      { agent: "claude", isStartable: true },
    ])
  })

  it("offers no agent before the agents step of setup is saved", () => {
    expect(offerAgents(null, ["claude"], AGENT_MODELS)).toStrictEqual([])
  })
})

describe("defaultWriterKeyOf", () => {
  it("picks the default agent of setup, whether or not Flight Plan can start it", () => {
    const agents = createAgents()

    expect(defaultWriterKeyOf(agents, offerAgents(agents, ["claude", "codex"], AGENT_MODELS))).toBe("claude")
    expect(defaultWriterKeyOf(agents, offerAgents(agents, [], AGENT_MODELS))).toBe("claude")
  })

  it("picks the first agent set up when the default one is not offered", () => {
    const agents = createAgents({ defaultAgent: "cursor" })

    expect(defaultWriterKeyOf(agents, offerAgents(agents, ["claude"], AGENT_MODELS))).toBe("codex")
  })

  it("picks no agent when none is set up", () => {
    expect(defaultWriterKeyOf(null, [])).toBe("none")
  })
})
