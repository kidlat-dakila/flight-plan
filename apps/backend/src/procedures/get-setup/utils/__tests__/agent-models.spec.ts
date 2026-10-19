import {
  effortLabelOf,
  installedAgentsOf,
  modelLabelOf,
  offeredEffortOf,
  offerModels,
  savedEffortOf,
  savedModelOf,
  toModelOption,
  type AgentModels,
} from "@/procedures/get-setup/utils/agent-models"
import type { AgentsChoice } from "@/procedures/get-setup/utils/setup"

const AGENT_MODELS: AgentModels = {
  claude: [
    { model: "default", label: "Default (recommended)", efforts: ["low", "xhigh", "turbo"] },
    { model: "haiku", label: "Haiku 4.5", efforts: [] },
  ],
  codex: [],
}

const CHOICE: AgentsChoice = {
  installs: [{ agent: "claude", installPath: "/home/.claude", model: "haiku", effort: "low" }],
  defaultAgent: "claude",
}

describe("offerModels", () => {
  it("offers the models the agent lists, each with the agent's default effort and its own efforts", () => {
    expect(offerModels("claude", AGENT_MODELS, null)).toStrictEqual([
      {
        model: "default",
        label: "Default (recommended)",
        efforts: [
          { effort: "default", label: "Default" },
          { effort: "low", label: "Low" },
          { effort: "xhigh", label: "Extra high" },
          { effort: "turbo", label: "turbo" },
        ],
      },
      { model: "haiku", label: "Haiku 4.5", efforts: [{ effort: "default", label: "Default" }] },
    ])
  })

  it("offers only the agent's default when the agent lists no models", () => {
    expect(offerModels("codex", AGENT_MODELS, null)).toStrictEqual([
      { model: "default", label: "Your Codex default", efforts: [{ effort: "default", label: "Default" }] },
    ])
    expect(offerModels("cursor", AGENT_MODELS, null)).toMatchObject([{ model: "default", label: "Your Cursor default" }])
    expect(offerModels("claude", {}, null)).toMatchObject([
      {
        model: "default",
        label: "Your Claude default",
        efforts: [{ effort: "default" }, { effort: "low" }, { effort: "medium" }, { effort: "high" }, { effort: "max" }],
      },
    ])
  })

  it("adds the saved model when the agent does not list it, and does not repeat one it lists", () => {
    expect(offerModels("claude", AGENT_MODELS, "retired-model")).toMatchObject([
      { model: "default" },
      { model: "haiku" },
      { model: "retired-model", label: "retired-model" },
    ])
    expect(offerModels("claude", AGENT_MODELS, "haiku")).toHaveLength(2)
    expect(offerModels("codex", {}, "gpt")).toMatchObject([{ model: "default" }, { model: "gpt", label: "gpt" }])
  })
})

describe("modelLabelOf", () => {
  it("names a model the agent lists, and falls back to the stored value", () => {
    expect(modelLabelOf("claude", AGENT_MODELS, "haiku")).toBe("Haiku 4.5")
    expect(modelLabelOf("claude", AGENT_MODELS, "retired-model")).toBe("retired-model")
  })
})

describe("savedModelOf", () => {
  it("reads the model saved for an agent, and nothing for an agent that is not set up", () => {
    expect(savedModelOf(CHOICE, "claude")).toBe("haiku")
    expect(savedModelOf(CHOICE, "codex")).toBeNull()
    expect(savedModelOf(null, "claude")).toBeNull()
  })
})

describe("installedAgentsOf", () => {
  it("names the agents that are set up", () => {
    expect(installedAgentsOf(CHOICE)).toStrictEqual(["claude"])
    expect(installedAgentsOf(null)).toStrictEqual([])
  })
})

describe("savedEffortOf", () => {
  it("reads the effort saved for an agent, and nothing for an agent that is not set up", () => {
    expect(savedEffortOf(CHOICE, "claude")).toBe("low")
    expect(savedEffortOf(CHOICE, "codex")).toBeNull()
    expect(savedEffortOf(null, "claude")).toBeNull()
  })
})

describe("offeredEffortOf", () => {
  it("keeps an effort the model offers, and falls back to the agent's default effort", () => {
    const [listed, haiku] = offerModels("claude", AGENT_MODELS, null)

    expect(offeredEffortOf(listed, "xhigh")).toBe("xhigh")
    expect(offeredEffortOf(haiku, "xhigh")).toBe("default")
    expect(offeredEffortOf(listed, null)).toBe("default")
    expect(offeredEffortOf(undefined, "xhigh")).toBe("default")
  })
})

describe("toModelOption", () => {
  it("offers a model with its efforts and selects the preferred effort when the model offers it", () => {
    const [listed, haiku] = offerModels("claude", AGENT_MODELS, null)

    expect(toModelOption(listed, "xhigh")).toMatchObject({
      model: "default",
      label: "Default (recommended)",
      hasEffortChoice: true,
      effortOptions: [{ effort: "default" }, { effort: "low" }, { effort: "xhigh" }, { effort: "turbo" }],
      selectedEffort: "xhigh",
    })
    expect(toModelOption(haiku, "xhigh")).toStrictEqual({
      model: "haiku",
      label: "Haiku 4.5",
      hasEffortChoice: false,
      effortOptions: [{ effort: "default", label: "Default" }],
      selectedEffort: "default",
    })
  })
})

describe("effortLabelOf", () => {
  it("names an effort the saved model offers, and falls back to the stored value", () => {
    expect(effortLabelOf("claude", AGENT_MODELS, { model: "default", effort: "xhigh" })).toBe("Extra high")
    expect(effortLabelOf("claude", AGENT_MODELS, { model: "haiku", effort: "retired-effort" })).toBe("retired-effort")
  })
})
