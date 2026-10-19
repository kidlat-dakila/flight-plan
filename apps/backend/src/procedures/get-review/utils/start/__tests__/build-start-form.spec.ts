import { buildStartForm } from "@/procedures/get-review/utils/start/build-start-form"
import type { AgentModels } from "@/procedures/get-setup/utils/agent-models"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"
import { listConfigurationsOf, shippedConfigurationOf } from "@/procedures/list-configurations/utils/configuration"

const AGENT_MODELS: AgentModels = {
  claude: [
    { model: "default", label: "Default (recommended)", efforts: ["low", "xhigh"] },
    { model: "sonnet", label: "Sonnet 5.5", efforts: ["low", "xhigh"] },
    { model: "haiku", label: "Haiku 4.5", efforts: [] },
  ],
}

const SHORT_REVIEWS = { ...shippedConfigurationOf("minimal"), id: "short-reviews", name: "Short reviews" }
const CONFIGURATIONS = listConfigurationsOf([SHORT_REVIEWS])

const setup: Setup = {
  ...EMPTY_SETUP,
  defaultConfiguration: "onboardee",
  agents: {
    installs: [
      { agent: "claude", installPath: "/home/.claude", model: "sonnet", effort: "default" },
      { agent: "cursor", installPath: "/home/.cursor", model: "default", effort: "default" },
    ],
    defaultAgent: "claude",
  },
}

describe("buildStartForm", () => {
  it("lists the default configuration first, tagged and selected, then the presets and the user's own", () => {
    expect(buildStartForm(setup, CONFIGURATIONS, ["claude"], AGENT_MODELS).configuration).toMatchObject({
      selectedConfigurationId: "onboardee",
      options: [
        { configurationId: "onboardee", label: "Onboardee", tagLabel: "Default" },
        { configurationId: "standard", tagLabel: null },
        { configurationId: "minimal", tagLabel: null },
        { configurationId: "unfamiliar-territory", tagLabel: null },
        {
          configurationId: "short-reviews",
          label: "Short reviews",
          bestFor: "Your configuration, based on Minimal.",
          tagLabel: null,
        },
      ],
    })
  })

  it("selects a default configuration of the user's own", () => {
    const ownDefault: Setup = { ...setup, defaultConfiguration: "short-reviews" }

    expect(buildStartForm(ownDefault, CONFIGURATIONS, ["claude"], AGENT_MODELS).configuration).toMatchObject({
      selectedConfigurationId: "short-reviews",
      options: [{ configurationId: "short-reviews", tagLabel: "Default" }, {}, {}, {}, {}],
    })
  })

  it("falls back to the standard configuration before setup chose one, or when the default is gone", () => {
    const goneDefault: Setup = { ...setup, defaultConfiguration: "deleted-one" }

    expect(buildStartForm(EMPTY_SETUP, CONFIGURATIONS, [], AGENT_MODELS).configuration).toMatchObject({
      selectedConfigurationId: "standard",
      options: [{ configurationId: "standard", tagLabel: "Default" }, {}, {}, {}, {}],
    })
    expect(buildStartForm(goneDefault, CONFIGURATIONS, [], AGENT_MODELS).configuration.selectedConfigurationId).toBe("standard")
  })

  it("offers the four orders, the default one tagged, and a custom one that takes the reviewer's instruction", () => {
    expect(buildStartForm(setup, CONFIGURATIONS, ["claude"], AGENT_MODELS).order).toMatchObject({
      selectedOrder: "foundations-first",
      options: [
        {
          order: "foundations-first",
          label: "Foundations first",
          tagLabel: "Default",
          summary: "Definitions before the code that uses them.",
          promptField: null,
        },
        { order: "along-the-path", label: "Along the path", tagLabel: null, promptField: null },
        { order: "core-change-first", label: "Core change first", promptField: null },
        { order: "risk-first", label: "Risk first", promptField: null },
        { order: "custom", label: "Custom", promptField: { label: "Your instruction for the order" } },
      ],
    })
  })

  it("offers each installed agent with the models it lists, each with its own efforts, and building without an agent", () => {
    expect(buildStartForm(setup, CONFIGURATIONS, ["claude"], AGENT_MODELS).writer).toMatchObject({
      selectedKey: "claude",
      agents: [
        {
          agent: "claude",
          description: "Flight Plan starts Claude in this repository and asks it to write the review.",
          modelLegend: "Model for Claude",
          effortLegend: "Effort for Claude",
          hasModelChoice: true,
          selectedModel: "sonnet",
          selectedEffort: "default",
          modelOptions: [
            { model: "default", label: "Default (recommended)", hasEffortChoice: true },
            {
              model: "sonnet",
              label: "Sonnet 5.5",
              hasEffortChoice: true,
              selectedEffort: "default",
              effortOptions: [
                { effort: "default", label: "Default" },
                { effort: "low", label: "Low" },
                { effort: "xhigh", label: "Extra high" },
              ],
            },
            {
              model: "haiku",
              label: "Haiku 4.5",
              hasEffortChoice: false,
              effortOptions: [{ effort: "default", label: "Default" }],
            },
          ],
          submitLabel: "Start the review",
        },
        {
          agent: "cursor",
          description: "Flight Plan can't start Cursor itself, so it gives you one line to run in Cursor.",
          hasModelChoice: false,
          submitLabel: "Get the line for Cursor",
        },
      ],
      none: {
        label: "Without an agent",
        description: "Flight Plan builds the review on its own, and you read it without a write-up.",
        submitLabel: "Build the review",
      },
    })
  })

  it("selects the effort chosen in setup for every model that offers it", () => {
    const withEffort: Setup = {
      ...setup,
      agents: {
        installs: [{ agent: "claude", installPath: "/home/.claude", model: "sonnet", effort: "xhigh" }],
        defaultAgent: "claude",
      },
    }

    expect(buildStartForm(withEffort, CONFIGURATIONS, ["claude"], AGENT_MODELS).writer.agents).toMatchObject([
      {
        selectedEffort: "xhigh",
        modelOptions: [
          { model: "default", selectedEffort: "xhigh" },
          { model: "sonnet", selectedEffort: "xhigh" },
          { model: "haiku", selectedEffort: "default" },
        ],
      },
    ])
  })

  it("selects building without an agent when no agent is set up", () => {
    expect(buildStartForm(EMPTY_SETUP, CONFIGURATIONS, ["claude"], AGENT_MODELS).writer).toMatchObject({ selectedKey: "none", agents: [] })
  })
})
