import { planAgentsChoice } from "@/procedures/save-setup-step/utils/plan-agents-choice"
import type { AgentsInput } from "@/procedures/save-setup-step/utils/schemas"

const inputOf = (overrides: Partial<AgentsInput>): AgentsInput => ({
  step: "agents",
  agents: [
    { agent: "claude", isPicked: true, installPath: " /Users/dev/.claude " },
    { agent: "codex", isPicked: false, installPath: "/Users/dev/.codex" },
    { agent: "cursor", isPicked: false, installPath: "" },
  ],
  defaultAgent: null,
  connection: "direct",
  ...overrides,
})

describe("planAgentsChoice", () => {
  it("accepts one picked agent and makes it the default", () => {
    expect(planAgentsChoice(inputOf({}))).toStrictEqual({
      kind: "accepted",
      choice: {
        installs: [{ agent: "claude", installPath: "/Users/dev/.claude" }],
        defaultAgent: "claude",
        connection: "direct",
      },
    })
  })

  it("rejects a setup with no agent", () => {
    const input = inputOf({ agents: [{ agent: "claude", isPicked: false, installPath: "/Users/dev/.claude" }] })

    expect(planAgentsChoice(input)).toStrictEqual({ kind: "rejected", message: "Pick at least one agent.", field: null })
  })

  it("rejects a picked agent whose folder is not a full path", () => {
    const input = inputOf({ agents: [{ agent: "cursor", isPicked: true, installPath: ".cursor" }] })

    expect(planAgentsChoice(input)).toStrictEqual({
      kind: "rejected",
      message: "Enter the full path of the folder where Cursor keeps its configuration.",
      field: { owner: "cursor", name: "installPath" },
    })
  })

  it("asks for a default when several agents are picked and none is chosen", () => {
    const agents: AgentsInput["agents"] = [
      { agent: "claude", isPicked: true, installPath: "/Users/dev/.claude" },
      { agent: "codex", isPicked: true, installPath: "/Users/dev/.codex" },
    ]

    expect(planAgentsChoice(inputOf({ agents }))).toStrictEqual({
      kind: "rejected",
      message: "Choose which of your agents is the default.",
      field: null,
    })
    expect(planAgentsChoice(inputOf({ agents, defaultAgent: "codex", connection: "manual" }))).toMatchObject({
      kind: "accepted",
      choice: { defaultAgent: "codex", connection: "manual" },
    })
  })
})
