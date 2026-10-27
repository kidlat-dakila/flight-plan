import type { TerminalApp } from "@/procedures/get-setup/utils/setup"
import { failedOpeningMessageOf, terminalPlaceOf, withTabAccessHint } from "@/procedures/open-agent-terminal/utils/terminal-messages"
import type { TerminalOpening } from "@/procedures/open-agent-terminal/utils/terminal-opener"
import type { TroubleshootingOpening } from "./schemas"

export const MISSING_DESCRIPTION_MESSAGE = "Say what went wrong, so the agent knows where to start."

const COPY_COMMAND_MESSAGE = "Copy the command and run it in a terminal yourself."
const NO_TERMINAL_MESSAGE = `Flight Plan can open a terminal on macOS only. ${COPY_COMMAND_MESSAGE}`

export const missingDescription: TroubleshootingOpening = { kind: "rejected", message: MISSING_DESCRIPTION_MESSAGE, field: "description" }

export const rejectedOpening = (message: string): TroubleshootingOpening => ({ kind: "rejected", message, field: null })

export const isDescriptionMissing = (input: { readonly errorLogId: string | null, readonly shownError: string | null, readonly description: string }): boolean =>
  input.errorLogId === null && input.shownError === null && input.description === ""

export interface TroubleshootingLaunch {
  readonly command: string
  readonly agentLabel: string
  readonly terminalApp: TerminalApp
}

export const openingOf = (terminal: TerminalOpening | null, launch: TroubleshootingLaunch): TroubleshootingOpening => {
  if (terminal === null) return { kind: "manual", message: NO_TERMINAL_MESSAGE, command: launch.command }
  if (terminal.kind === "failed") {
    return { kind: "manual", message: `${failedOpeningMessageOf(launch.terminalApp, terminal.reason)} ${COPY_COMMAND_MESSAGE}`, command: launch.command }
  }
  const startingMessage = `${launch.agentLabel} is starting in ${terminalPlaceOf(launch.terminalApp, terminal.isWindowFallback)} to troubleshoot.`
  return { kind: "opened", message: withTabAccessHint(startingMessage, terminal.isWindowFallback) }
}
