import { createConversationContext, KEY } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { openAgentTerminal } from "@/procedures/open-agent-terminal"
import type { TerminalOpener, TerminalOpening } from "@/procedures/open-agent-terminal/utils/terminal-opener"

const openerOf = (opening: TerminalOpening) => vi.fn<TerminalOpener>(async () => await Promise.resolve(opening))

const commandsOf = (opener: ReturnType<typeof openerOf>): readonly string[] => opener.mock.calls.map(([command]) => command)

describe("openAgentTerminal", () => {
  it("opens a terminal that starts Claude live on the review, in the repository's folder", async () => {
    const { context } = createConversationContext()
    const opener = openerOf({ kind: "opened" })

    await expect(openAgentTerminal(KEY, { ...context, openTerminal: opener })).resolves.toStrictEqual({
      kind: "opened",
      message: "Claude is starting in Terminal.",
    })
    expect(commandsOf(opener)).toHaveLength(1)
    expect(commandsOf(opener)[0]).toContain("cd '/Users/dev/projects/storefront' && claude '/flightplan:live storefront/pr-412' '--model' 'opus'")
  })

  it("says why Terminal could not be opened", async () => {
    const { context } = createConversationContext()

    await expect(openAgentTerminal(KEY, { ...context, openTerminal: openerOf({ kind: "failed", reason: "Not allowed." }) })).resolves.toStrictEqual({
      kind: "rejected",
      message: "Flight Plan could not open Terminal. Not allowed.",
    })
  })

  it("refuses where no terminal can be opened, with no live agent, or for a repository Flight Plan does not follow", async () => {
    const { context } = createConversationContext()
    const opener = openerOf({ kind: "opened" })

    await expect(openAgentTerminal(KEY, context)).resolves.toMatchObject({ kind: "rejected", message: "Flight Plan can open a terminal on macOS only. Copy the command and run it yourself." })
    await expect(openAgentTerminal(KEY, { ...createConversationContext({ setup: EMPTY_SETUP }).context, openTerminal: opener })).resolves.toMatchObject({ kind: "rejected" })
    await expect(openAgentTerminal({ repositoryName: "billing", targetId: "pr-1" }, { ...context, openTerminal: opener })).resolves.toMatchObject({ kind: "rejected" })
    expect(commandsOf(opener)).toStrictEqual([])
  })
})
