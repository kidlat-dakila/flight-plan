import { buildStartForm } from "@/procedures/get-review/utils/start/build-start-form"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"

const setup: Setup = {
  ...EMPTY_SETUP,
  preset: "onboardee",
  agents: {
    installs: [
      { agent: "claude", installPath: "/home/.claude", model: "sonnet" },
      { agent: "cursor", installPath: "/home/.cursor", model: "default" },
    ],
    defaultAgent: "claude",
    connection: "direct",
  },
}

describe("buildStartForm", () => {
  it("lists the default configuration first, tagged and selected", () => {
    expect(buildStartForm(setup, ["claude"]).configuration).toMatchObject({
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
    expect(buildStartForm(EMPTY_SETUP, []).configuration).toMatchObject({
      selectedPreset: "standard",
      options: [{ preset: "standard", tagLabel: "Default" }, {}, {}, {}],
    })
  })

  it("offers the four orders, the default one tagged, and a custom one that takes the reviewer's instruction", () => {
    expect(buildStartForm(setup, ["claude"]).order).toMatchObject({
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

  it("offers each installed agent with its models, and prompting by hand", () => {
    expect(buildStartForm(setup, ["claude"]).writer).toMatchObject({
      selectedKey: "claude",
      agents: [
        {
          agent: "claude",
          unavailableReason: null,
          selectedModel: "sonnet",
          modelChoice: {
            legend: "Model for Claude",
            options: [{ model: "default" }, { model: "opus" }, { model: "sonnet" }, { model: "haiku" }],
          },
          selectedEffort: "default",
          hasSettings: true,
          effortChoice: {
            legend: "Effort for Claude",
            options: [
              { effort: "default", label: "Default" },
              { effort: "low", label: "Low" },
              { effort: "medium", label: "Medium" },
              { effort: "high", label: "High" },
              { effort: "max", label: "Max" },
            ],
          },
          submitLabel: "Start the review",
        },
        {
          agent: "cursor",
          unavailableReason: "Flight Plan cannot start Cursor yet. Prompt it yourself instead.",
          modelChoice: null,
          effortChoice: null,
          hasSettings: false,
        },
      ],
      manual: { label: "I will prompt my agent myself", submitLabel: "Copy the prompt" },
    })
  })

  it("selects prompting by hand when no agent is set up", () => {
    expect(buildStartForm(EMPTY_SETUP, ["claude"]).writer).toMatchObject({ selectedKey: "manual", agents: [] })
  })
})
