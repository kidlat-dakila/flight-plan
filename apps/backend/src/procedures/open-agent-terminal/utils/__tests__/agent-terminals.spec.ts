import { InMemoryAgentTerminalRegistry } from "@/procedures/open-agent-terminal/utils/agent-terminals"

const KEY = { repositoryName: "storefront", targetId: "pr-412" }
const OTHER_KEY = { repositoryName: "storefront", targetId: "pr-413" }
const GHOSTTY_TAB = { terminalApp: "ghostty", terminalId: "6F1C-22", ttyPath: "/tmp/flightplan-tty-1f2e" } as const
const WARP_TAB = { terminalApp: "warp", ttyPath: "/tmp/flightplan-tty-9a0b" } as const

describe("InMemoryAgentTerminalRegistry", () => {
  it("keeps the agent's tab for each review until it is forgotten", () => {
    const registry = new InMemoryAgentTerminalRegistry()

    registry.remember(KEY, GHOSTTY_TAB)
    registry.remember(OTHER_KEY, WARP_TAB)
    registry.forget(OTHER_KEY)

    expect(registry.tabOf(KEY)).toStrictEqual(GHOSTTY_TAB)
    expect(registry.tabOf(OTHER_KEY)).toBeNull()
  })

  it("keeps only the latest tab of a review", () => {
    const registry = new InMemoryAgentTerminalRegistry()

    registry.remember(KEY, GHOSTTY_TAB)
    registry.remember(KEY, WARP_TAB)

    expect(registry.tabOf(KEY)).toStrictEqual(WARP_TAB)
  })
})
