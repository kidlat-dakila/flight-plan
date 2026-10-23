import type { TerminalOpening } from "@/procedures/open-agent-terminal/utils/terminal-opener"
import type { TroubleshootingOpening } from "./schemas"

export const MISSING_DESCRIPTION_MESSAGE = "Say what went wrong, so the agent knows where to start."

const NO_TERMINAL_MESSAGE = "Flight Plan can open a terminal on macOS only. Copy the command and run it in a terminal yourself."

export const missingDescription: TroubleshootingOpening = { kind: "rejected", message: MISSING_DESCRIPTION_MESSAGE, field: "description" }

export const rejectedOpening = (message: string): TroubleshootingOpening => ({ kind: "rejected", message, field: null })

export const isDescriptionMissing = (input: { readonly errorLogId: string | null, readonly shownError: string | null, readonly description: string }): boolean =>
  input.errorLogId === null && input.shownError === null && input.description === ""

export const openingOf = (terminal: TerminalOpening | null, command: string, agentLabel: string): TroubleshootingOpening => {
  if (terminal === null) return { kind: "manual", message: NO_TERMINAL_MESSAGE, command }
  if (terminal.kind === "failed") {
    return { kind: "manual", message: `Flight Plan could not open Terminal. ${terminal.reason} Copy the command and run it in a terminal yourself.`, command }
  }
  return { kind: "opened", message: `${agentLabel} is starting in Terminal to troubleshoot.` }
}
