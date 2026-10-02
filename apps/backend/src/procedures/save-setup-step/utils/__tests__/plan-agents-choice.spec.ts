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

const FOLDER_CONTENTS = [
  { path: "/Users/dev/.claude", entryNames: ["plugins", "settings.json"] },
  { path: "/Users/dev/.codex", entryNames: ["auth.json"] },
  { path: "/Users/dev/.cluade", entryNames: null },
  { path: "/Users/dev/projects", entryNames: ["storefront"] },
]

const MACHINE = { folderContents: FOLDER_CONTENTS, agentsWithCli: ["claude", "codex", "cursor"] as const }

describe("planAgentsChoice", () => {
  it("accepts one picked agent and makes it the default", () => {
    expect(planAgentsChoice(inputOf({}), MACHINE)).toStrictEqual({
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

    expect(planAgentsChoice(input, MACHINE)).toStrictEqual({ kind: "rejected", message: "Pick at least one agent.", field: null })
  })

  it("rejects a picked agent whose folder is not a full path", () => {
    const input = inputOf({ agents: [{ agent: "cursor", isPicked: true, installPath: ".cursor" }] })

    expect(planAgentsChoice(input, MACHINE)).toStrictEqual({
      kind: "rejected",
      message: "Enter the full path of the folder where Cursor keeps its configuration.",
      field: { owner: "cursor", name: "installPath" },
    })
  })

  it("rejects a picked agent whose command line program is not on this machine", () => {
    expect(planAgentsChoice(inputOf({}), { ...MACHINE, agentsWithCli: ["codex"] })).toStrictEqual({
      kind: "rejected",
      message:
        "Flight Plan works with Claude through its command line program, claude, which was not found on this machine. Install it, then save again.",
      field: { owner: "claude", name: "cli" },
    })
  })

  it("rejects a picked agent whose folder is not on this machine", () => {
    const input = inputOf({ agents: [{ agent: "claude", isPicked: true, installPath: "/Users/dev/.cluade" }] })

    expect(planAgentsChoice(input, MACHINE)).toStrictEqual({
      kind: "rejected",
      message: "There is no folder at /Users/dev/.cluade. Enter the folder where Claude keeps its configuration, or browse to it.",
      field: { owner: "claude", name: "installPath" },
    })
  })

  it("rejects a folder that holds nothing of that agent", () => {
    const input = inputOf({ agents: [{ agent: "codex", isPicked: true, installPath: "/Users/dev/projects" }] })

    expect(planAgentsChoice(input, MACHINE)).toStrictEqual({
      kind: "rejected",
      message:
        "/Users/dev/projects does not look like the folder Codex keeps its configuration in. Enter that folder, or browse to it.",
      field: { owner: "codex", name: "installPath" },
    })
  })

  it("rejects another agent's folder", () => {
    const input = inputOf({ agents: [{ agent: "cursor", isPicked: true, installPath: "/Users/dev/.claude" }] })

    expect(planAgentsChoice(input, MACHINE)).toMatchObject({
      kind: "rejected",
      field: { owner: "cursor", name: "installPath" },
    })
  })

  it("does not look at the folder of an agent that is not picked", () => {
    const agents: AgentsInput["agents"] = [
      { agent: "claude", isPicked: true, installPath: "/Users/dev/.claude" },
      { agent: "cursor", isPicked: false, installPath: "/nowhere" },
    ]

    expect(planAgentsChoice(inputOf({ agents }), MACHINE)).toMatchObject({ kind: "accepted" })
  })

  it("asks for a default when several agents are picked and none is chosen", () => {
    const agents: AgentsInput["agents"] = [
      { agent: "claude", isPicked: true, installPath: "/Users/dev/.claude" },
      { agent: "codex", isPicked: true, installPath: "/Users/dev/.codex" },
    ]

    expect(planAgentsChoice(inputOf({ agents }), MACHINE)).toStrictEqual({
      kind: "rejected",
      message: "Choose which of your agents is the default.",
      field: null,
    })
    expect(planAgentsChoice(inputOf({ agents, defaultAgent: "codex", connection: "manual" }), MACHINE)).toMatchObject({
      kind: "accepted",
      choice: { defaultAgent: "codex", connection: "manual" },
    })
  })
})
