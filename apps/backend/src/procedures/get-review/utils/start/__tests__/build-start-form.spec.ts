import { buildStartForm } from "@/procedures/get-review/utils/start/build-start-form"
import type { AgentModels } from "@/procedures/get-setup/utils/agent-models"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"

const AGENT_MODELS: AgentModels = {
  claude: [
    { model: "default", label: "Default (recommended)", efforts: ["low", "xhigh"] },
    { model: "sonnet", label: "Sonnet 5.5", efforts: ["low", "xhigh"] },
    { model: "haiku", label: "Haiku 4.5", efforts: [] },
  ],
}

const setup: Setup = {
  ...EMPTY_SETUP,
  preset: "onboardee",
  agents: {
    installs: [
      { agent: "claude", installPath: "/home/.claude", model: "sonnet", effort: "default" },
      { agent: "cursor", installPath: "/home/.cursor", model: "default", effort: "default" },
    ],
    defaultAgent: "claude",
    connection: "direct",
  },
}

describe("buildStartForm", () => {
  it("lists the default configuration first, tagged and selected", () => {
    expect(buildStartForm(setup, ["claude"], AGENT_MODELS).configuration).toMatchObject({
      selectedPreset: "onboardee",
      options: [
        { preset: "onboardee", label: "Onboardee", tagLabel: "Default" },
        { preset: "standard", tagLabel: null },
        { preset: "minimal", tagLabel: null },
        { preset: "unfamiliar-territory", tagLabel: null },
      ],
    })
  })

  it("falls back to the standard configuration before setup chose one", () => {
    expect(buildStartForm(EMPTY_SETUP, [], AGENT_MODELS).configuration).toMatchObject({
      selectedPreset: "standard",
      options: [{ preset: "standard", tagLabel: "Default" }, {}, {}, {}],
    })
  })

  it("offers the four orders, the default one tagged, and a custom one that takes the reviewer's instruction", () => {
    expect(buildStartForm(setup, ["claude"], AGENT_MODELS).order).toMatchObject({
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

  it("offers each installed agent with the models it lists, each with its own efforts, and prompting by hand", () => {
    expect(buildStartForm(setup, ["claude"], AGENT_MODELS).writer).toMatchObject({
      selectedKey: "claude",
      agents: [
        {
          agent: "claude",
          unavailableReason: null,
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
          unavailableReason: "Flight Plan cannot start Cursor yet. Prompt it yourself instead.",
          hasModelChoice: false,
          modelOptions: [{ model: "default", label: "Your Cursor default", hasEffortChoice: false }],
        },
      ],
      manual: { label: "I will prompt my agent myself", submitLabel: "Copy the prompt" },
    })
  })

  it("selects the effort chosen in setup for every model that offers it", () => {
    const withEffort: Setup = {
      ...setup,
      agents: {
        installs: [{ agent: "claude", installPath: "/home/.claude", model: "sonnet", effort: "xhigh" }],
        defaultAgent: "claude",
        connection: "direct",
      },
    }

    expect(buildStartForm(withEffort, ["claude"], AGENT_MODELS).writer.agents).toMatchObject([
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

  it("selects prompting by hand when no agent is set up", () => {
    expect(buildStartForm(EMPTY_SETUP, ["claude"], AGENT_MODELS).writer).toMatchObject({ selectedKey: "manual", agents: [] })
  })
})
