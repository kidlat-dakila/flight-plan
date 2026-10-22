import { buildLiveAgent, type LiveAgentFacts } from "@/procedures/get-live-agent/utils/build-live-agent"

const FACTS: LiveAgentFacts = {
  key: { repositoryName: "storefront", targetId: "pr-412" },
  agent: "claude",
  isLiveAgent: true,
  canOpenTerminal: true,
  isOnline: false,
}

describe("buildLiveAgent", () => {
  it("offers to open a terminal and gives the live command to copy for Claude", () => {
    expect(buildLiveAgent(FACTS)).toMatchObject({
      kind: "live",
      isOnline: false,
      statusLabel: "Claude offline",
      dialog: {
        title: "Claude is offline",
        terminal: { label: "Open a terminal for me" },
        manual: { label: "I'll start it myself", prompt: "/flightplan:live storefront/pr-412", copiedMessage: "Command copied" },
        closeLabel: "Not now",
      },
    })
  })

  it("says the agent is online", () => {
    expect(buildLiveAgent({ ...FACTS, isOnline: true })).toMatchObject({ isOnline: true, statusLabel: "Claude online" })
  })

  it("offers only the command to copy where Flight Plan cannot open a terminal", () => {
    expect(buildLiveAgent({ ...FACTS, canOpenTerminal: false })).toMatchObject({ dialog: { terminal: null } })
  })

  it("gives an agent with no live skill its own prompt to copy, and no terminal", () => {
    const live = buildLiveAgent({ ...FACTS, agent: "codex", isLiveAgent: false })

    expect(live).toMatchObject({ statusLabel: "Codex offline", dialog: { terminal: null } })
    expect(live.kind === "live" ? live.dialog.manual.prompt : "").toContain("repositoryName \"storefront\" and targetId \"pr-412\"")
  })
})
