import { CLAUDE_AGENTS, createConversationContext, KEY, WITH_CLAUDE } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { EMPTY_SETUP, type Setup, type TerminalApp } from "@/procedures/get-setup/utils/setup"
import { openAgentTerminal } from "@/procedures/open-agent-terminal"
import type { TerminalOpener, TerminalOpening } from "@/procedures/open-agent-terminal/utils/terminal-opener"
import { createTestErrorLog } from "@/procedures/record-error/utils/__tests__/error-log-fixture"

const TERMINAL_TAB = { terminalApp: "terminal", windowId: 4120, tty: "/dev/ttys007" } as const

const setupWith = (terminalApp: TerminalApp): Setup => ({ ...WITH_CLAUDE, agents: { ...CLAUDE_AGENTS, terminalApp } })

const openerOf = (opening: TerminalOpening) => vi.fn<TerminalOpener>(async () => await Promise.resolve(opening))

const commandsOf = (opener: ReturnType<typeof openerOf>): readonly string[] => opener.mock.calls.map(([command]) => command)

describe("openAgentTerminal", () => {
  it("opens a terminal that starts Claude live on the review, in the repository's folder", async () => {
    const { context, environment } = createConversationContext()
    const opener = openerOf({ kind: "opened", tab: TERMINAL_TAB, isWindowFallback: false })

    await expect(openAgentTerminal(KEY, { ...context, openTerminal: opener })).resolves.toStrictEqual({
      kind: "opened",
      message: "Claude is starting in Terminal.",
    })
    expect(commandsOf(opener)).toHaveLength(1)
    expect(commandsOf(opener)[0]).toContain("cd '/Users/dev/projects/storefront' && claude '/flightplan:live storefront/pr-412' '--model' 'opus'")
    expect(opener.mock.calls[0]?.[1]).toBe("terminal")
    expect(environment.agentTerminals.tabOf(KEY)).toStrictEqual(TERMINAL_TAB)
  })

  it("opens the agent in the terminal app the setup chose, and names it", async () => {
    const { context, environment } = createConversationContext({ setup: setupWith("iterm") })
    const opener = openerOf({ kind: "opened", tab: { terminalApp: "iterm", tty: "/dev/ttys011" }, isWindowFallback: false })

    await expect(openAgentTerminal(KEY, { ...context, openTerminal: opener })).resolves.toStrictEqual({ kind: "opened", message: "Claude is starting in iTerm2." })
    expect(opener.mock.calls[0]?.[1]).toBe("iterm")
    expect(environment.agentTerminals.tabOf(KEY)).toStrictEqual({ terminalApp: "iterm", tty: "/dev/ttys011" })
  })

  it("tells how to get tabs when Terminal opened a window because macOS refused the keystroke", async () => {
    const { context } = createConversationContext()

    await expect(openAgentTerminal(KEY, { ...context, openTerminal: openerOf({ kind: "opened", tab: TERMINAL_TAB, isWindowFallback: true }) })).resolves.toStrictEqual({
      kind: "opened",
      message: "Claude is starting in a new Terminal window. To open tabs instead, allow Flight Plan in System Settings under Privacy & Security, Accessibility.",
    })
  })

  it("remembers no tab when the terminal app reported none", async () => {
    const { context, environment } = createConversationContext()

    await openAgentTerminal(KEY, { ...context, openTerminal: openerOf({ kind: "opened", tab: null, isWindowFallback: false }) })

    expect(environment.agentTerminals.tabOf(KEY)).toBeNull()
  })

  it("says why the terminal app could not be opened, and logs it", async () => {
    const { context } = createConversationContext()
    const { errorLog, storage } = createTestErrorLog()

    await expect(openAgentTerminal(KEY, { ...context, errorLog, openTerminal: openerOf({ kind: "failed", reason: "Not allowed." }) })).resolves.toStrictEqual({
      kind: "rejected",
      message: "Flight Plan could not open Terminal. Not allowed.",
    })
    await expect(storage.read("20261023-142530-000001")).resolves.toMatchObject({ source: "Agent terminal", message: "Not allowed." })
    await expect(openAgentTerminal(KEY, {
      ...createConversationContext({ setup: setupWith("warp") }).context,
      openTerminal: openerOf({ kind: "failed", reason: "Not allowed." }),
    })).resolves.toMatchObject({ message: "Flight Plan could not open Warp. Not allowed." })
  })

  it("refuses where no terminal can be opened, with no live agent, or for a repository Flight Plan does not follow", async () => {
    const { context } = createConversationContext()
    const opener = openerOf({ kind: "opened", tab: TERMINAL_TAB, isWindowFallback: false })

    await expect(openAgentTerminal(KEY, context)).resolves.toMatchObject({ kind: "rejected", message: "Flight Plan can open a terminal on macOS only. Copy the command and run it yourself." })
    await expect(openAgentTerminal(KEY, { ...createConversationContext({ setup: EMPTY_SETUP }).context, openTerminal: opener })).resolves.toMatchObject({ kind: "rejected" })
    await expect(openAgentTerminal({ repositoryName: "billing", targetId: "pr-1" }, { ...context, openTerminal: opener })).resolves.toMatchObject({ kind: "rejected" })
    expect(commandsOf(opener)).toStrictEqual([])
  })
})
