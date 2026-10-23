import { WITH_CLAUDE } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import type { TerminalOpener, TerminalOpening } from "@/procedures/open-agent-terminal/utils/terminal-opener"
import { createTestErrorLog, errorEntryOf, LOGS_FOLDER } from "@/procedures/record-error/utils/__tests__/error-log-fixture"
import { requestTroubleshooting } from "@/procedures/request-troubleshooting"
import type { RequestTroubleshootingInput } from "@/procedures/request-troubleshooting/utils/schemas"
import { buildTroubleshootCommand } from "@/procedures/request-troubleshooting/utils/troubleshoot-command"

const ATTACHED_ID = "20261023-142000-000009"
const OLDER_ID = "20261023-141000-000008"
const REQUEST_ID = "20261023-142530-000001"
const PAGE = { path: "/settings/agents", title: "Agents" }

const INPUT: RequestTroubleshootingInput = { errorLogId: ATTACHED_ID, shownError: "The token was refused.", description: "I saved the agents.", page: PAGE }

const openerOf = (opening: TerminalOpening) => vi.fn<TerminalOpener>(async () => await Promise.resolve(opening))

const contextOf = (openTerminal: TerminalOpener | null, setup: Setup = WITH_CLAUDE) => {
  const testLog = createTestErrorLog([errorEntryOf(ATTACHED_ID, "The token was refused."), errorEntryOf(OLDER_ID, "Fetch failed.")])
  return { ...testLog, context: { errorLog: testLog.errorLog, setupStore: new InMemorySetupStore(setup), openTerminal } }
}

describe("requestTroubleshooting", () => {
  it("saves the request and starts Claude on it in Terminal, in the logs folder", async () => {
    const opener = openerOf({ kind: "opened", window: null })
    const { context, storage } = contextOf(opener)

    await expect(requestTroubleshooting(INPUT, context)).resolves.toStrictEqual({ kind: "opened", message: "Claude is starting in Terminal to troubleshoot." })
    expect(opener).toHaveBeenCalledWith(
      `cd '/Users/dana/.flightplan/logs' && claude '/flightplan:troubleshoot ${REQUEST_ID}' '--model' 'opus' '--allowedTools' 'mcp__plugin_flightplan_flightplan__*' 'WebFetch(domain:github.com)' 'WebFetch(domain:raw.githubusercontent.com)'`,
    )
    await expect(storage.read(REQUEST_ID)).resolves.toMatchObject({
      kind: "request",
      description: "I saved the agents.",
      shownError: "The token was refused.",
      page: PAGE,
      errorLogId: ATTACHED_ID,
      recentErrorLogIds: [OLDER_ID],
      agent: "Claude",
    })
  })

  it("gives the command to copy where no terminal can be opened", async () => {
    const { context } = contextOf(null)

    await expect(requestTroubleshooting(INPUT, context)).resolves.toStrictEqual({
      kind: "manual",
      message: "Flight Plan can open a terminal on macOS only. Copy the command and run it in a terminal yourself.",
      command: buildTroubleshootCommand({ workingPath: LOGS_FOLDER, requestId: REQUEST_ID, model: "opus", effort: "default" }),
    })
  })

  it("logs why Terminal could not be opened and gives the command to copy", async () => {
    const { context, storage } = contextOf(openerOf({ kind: "failed", reason: "Not allowed." }))

    await expect(requestTroubleshooting(INPUT, context)).resolves.toMatchObject({
      kind: "manual",
      message: "Flight Plan could not open Terminal. Not allowed. Copy the command and run it in a terminal yourself.",
    })
    await expect(storage.read("20261023-142530-000002")).resolves.toMatchObject({ source: "Troubleshoot terminal", message: "Not allowed." })
  })

  it("asks what went wrong when there is no error to start from", async () => {
    const { context, storage } = contextOf(openerOf({ kind: "opened", window: null }))

    await expect(requestTroubleshooting({ ...INPUT, errorLogId: null, shownError: null, description: "" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Say what went wrong, so the agent knows where to start.",
      field: "description",
    })
    await expect(storage.listIds()).resolves.toHaveLength(2)
  })

  it("refuses when no agent can troubleshoot", async () => {
    const { context } = contextOf(openerOf({ kind: "opened", window: null }), EMPTY_SETUP)

    await expect(requestTroubleshooting(INPUT, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Flight Plan can start only Claude to troubleshoot. Add Claude in Settings, under Agents, and try again.",
      field: null,
    })
  })

  it("keeps no log id that Flight Plan did not log", async () => {
    const { context, storage } = contextOf(openerOf({ kind: "opened", window: null }))

    await requestTroubleshooting({ ...INPUT, errorLogId: "20261023-000000-abcdef" }, context)

    await expect(storage.read(REQUEST_ID)).resolves.toMatchObject({ errorLogId: null, recentErrorLogIds: [ATTACHED_ID, OLDER_ID] })
  })
})
