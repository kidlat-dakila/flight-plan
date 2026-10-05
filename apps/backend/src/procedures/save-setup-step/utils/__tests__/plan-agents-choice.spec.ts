import { planAgentsChoice } from "@/procedures/save-setup-step/utils/plan-agents-choice"
import type { AgentsInput } from "@/procedures/save-setup-step/utils/schemas"

const inputOf = (overrides: Partial<AgentsInput>): AgentsInput => ({
  step: "agents",
  agents: [
    { agent: "claude", isPicked: true, installPath: " /Users/dev/.claude ", model: "default", effort: "default" },
    { agent: "codex", isPicked: false, installPath: "/Users/dev/.codex", model: "default", effort: "default" },
    { agent: "cursor", isPicked: false, installPath: "", model: "default", effort: "default" },
  ],
  defaultAgent: null,
  connection: "direct",
  ...overrides,
})

const FOLDER_CONTENTS = [
  { path: "/Users/dev/.claude", entryNames: ["plugins", "settings.json"] },
  { path: "/Users/dev/.codex", entryNames: ["auth.json"] },
  { path: "/Users/dev/.cluade", entryNames: null },
  { path: "/Users/dev/projects", entryNames: ["storefront"] },
]

const LISTED_EFFORTS = ["low", "high"] as const

const MACHINE = {
  folderContents: FOLDER_CONTENTS,
  agentsWithCli: ["claude", "codex", "cursor"] as const,
  agentModels: {
    claude: [
      { model: "default", label: "Default (recommended)", efforts: LISTED_EFFORTS },
      { model: "opus", label: "Opus 5.5", efforts: LISTED_EFFORTS },
    ],
  },
}

describe("planAgentsChoice", () => {
  it("accepts one picked agent and makes it the default", () => {
    expect(planAgentsChoice(inputOf({}), MACHINE, null)).toStrictEqual({
      kind: "accepted",
      choice: {
        installs: [{ agent: "claude", installPath: "/Users/dev/.claude", model: "default", effort: "default" }],
        defaultAgent: "claude",
        connection: "direct",
      },
    })
  })

  it("rejects a setup with no agent", () => {
    const input = inputOf({ agents: [{ agent: "claude", isPicked: false, installPath: "/Users/dev/.claude", model: "default", effort: "default" }] })

    expect(planAgentsChoice(input, MACHINE, null)).toStrictEqual({ kind: "rejected", message: "Pick at least one agent.", field: null })
  })

  it("rejects a picked agent whose folder is not a full path", () => {
    const input = inputOf({ agents: [{ agent: "cursor", isPicked: true, installPath: ".cursor", model: "default", effort: "default" }] })

    expect(planAgentsChoice(input, MACHINE, null)).toStrictEqual({
      kind: "rejected",
      message: "Enter the full path of the folder where Cursor keeps its configuration.",
      field: { owner: "cursor", name: "installPath" },
    })
  })

  it("rejects a picked agent whose command line program is not on this machine", () => {
    expect(planAgentsChoice(inputOf({}), { ...MACHINE, agentsWithCli: ["codex"] }, null)).toStrictEqual({
      kind: "rejected",
      message:
        "Flight Plan works with Claude through its command line program, claude, which was not found on this machine. Install it, then save again.",
      field: { owner: "claude", name: "cli" },
    })
  })

  it("rejects a picked agent whose folder is not on this machine", () => {
    const input = inputOf({ agents: [{ agent: "claude", isPicked: true, installPath: "/Users/dev/.cluade", model: "default", effort: "default" }] })

    expect(planAgentsChoice(input, MACHINE, null)).toStrictEqual({
      kind: "rejected",
      message: "There is no folder at /Users/dev/.cluade. Enter the folder where Claude keeps its configuration, or browse to it.",
      field: { owner: "claude", name: "installPath" },
    })
  })

  it("rejects a folder that holds nothing of that agent", () => {
    const input = inputOf({ agents: [{ agent: "codex", isPicked: true, installPath: "/Users/dev/projects", model: "default", effort: "default" }] })

    expect(planAgentsChoice(input, MACHINE, null)).toStrictEqual({
      kind: "rejected",
      message:
        "/Users/dev/projects does not look like the folder Codex keeps its configuration in. Enter that folder, or browse to it.",
      field: { owner: "codex", name: "installPath" },
    })
  })

  it("rejects another agent's folder", () => {
    const input = inputOf({ agents: [{ agent: "cursor", isPicked: true, installPath: "/Users/dev/.claude", model: "default", effort: "default" }] })

    expect(planAgentsChoice(input, MACHINE, null)).toMatchObject({
      kind: "rejected",
      field: { owner: "cursor", name: "installPath" },
    })
  })

  it("does not look at the folder of an agent that is not picked", () => {
    const agents: AgentsInput["agents"] = [
      { agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "default", effort: "default" },
      { agent: "cursor", isPicked: false, installPath: "/nowhere", model: "default", effort: "default" },
    ]

    expect(planAgentsChoice(inputOf({ agents }), MACHINE, null)).toMatchObject({ kind: "accepted" })
  })

  it("asks for a default when several agents are picked and none is chosen", () => {
    const agents: AgentsInput["agents"] = [
      { agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "default", effort: "default" },
      { agent: "codex", isPicked: true, installPath: "/Users/dev/.codex", model: "default", effort: "default" },
    ]

    expect(planAgentsChoice(inputOf({ agents }), MACHINE, null)).toStrictEqual({
      kind: "rejected",
      message: "Choose which of your agents is the default.",
      field: null,
    })
    expect(planAgentsChoice(inputOf({ agents, defaultAgent: "codex", connection: "manual" }), MACHINE, null)).toMatchObject({
      kind: "accepted",
      choice: { defaultAgent: "codex", connection: "manual" },
    })
  })

  it("keeps the model chosen for each agent", () => {
    const agents: AgentsInput["agents"] = [{ agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "opus", effort: "default" }]

    expect(planAgentsChoice(inputOf({ agents }), MACHINE, null)).toMatchObject({
      kind: "accepted",
      choice: { installs: [{ agent: "claude", installPath: "/Users/dev/.claude", model: "opus", effort: "default" }] },
    })
  })

  it("rejects a model the agent does not offer", () => {
    const codex: AgentsInput["agents"] = [{ agent: "codex", isPicked: true, installPath: "/Users/dev/.codex", model: "opus", effort: "default" }]
    const claude: AgentsInput["agents"] = [{ agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "sonnet", effort: "default" }]

    expect(planAgentsChoice(inputOf({ agents: codex }), MACHINE, null)).toStrictEqual({
      kind: "rejected",
      message: "Choose one of the models Codex offers.",
      field: { owner: "codex", name: "model" },
    })
    expect(planAgentsChoice(inputOf({ agents: claude }), MACHINE, null)).toMatchObject({
      kind: "rejected",
      field: { owner: "claude", name: "model" },
    })
  })

  it("keeps the effort chosen for each agent and rejects one the chosen model does not offer", () => {
    const withEffort = (effort: string): AgentsInput["agents"] => [
      { agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "opus", effort },
    ]

    expect(planAgentsChoice(inputOf({ agents: withEffort("high") }), MACHINE, null)).toMatchObject({
      kind: "accepted",
      choice: { installs: [{ agent: "claude", model: "opus", effort: "high" }] },
    })
    expect(planAgentsChoice(inputOf({ agents: withEffort("max") }), MACHINE, null)).toStrictEqual({
      kind: "rejected",
      message: "Choose one of the efforts Opus 5.5 offers.",
      field: { owner: "claude", name: "effort" },
    })
  })

  it("keeps a saved model the agent no longer lists", () => {
    const agents: AgentsInput["agents"] = [{ agent: "claude", isPicked: true, installPath: "/Users/dev/.claude", model: "sonnet", effort: "default" }]
    const savedChoice = {
      installs: [{ agent: "claude", installPath: "/Users/dev/.claude", model: "sonnet", effort: "default" }],
      defaultAgent: "claude",
      connection: "direct",
    } as const

    expect(planAgentsChoice(inputOf({ agents }), MACHINE, savedChoice)).toMatchObject({
      kind: "accepted",
      choice: { installs: [{ agent: "claude", model: "sonnet" }] },
    })
  })
})
