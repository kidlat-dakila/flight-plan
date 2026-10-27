import type { TerminalOpening } from "@/procedures/open-agent-terminal/utils/terminal-opener"
import { appleScriptStringOf, CLOSE_WAIT_STEP_SECONDS, killLineOf, scriptArgumentsOf, waitUntilLinesOf } from "./apple-script"

const TERMINAL_ID_PATTERN = /^\S+$/

export const ghosttyOpenScriptArgumentsOf = (command: string): readonly string[] => scriptArgumentsOf([
  "tell application \"Ghostty\"",
  "activate",
  "if (count of windows) is 0 then",
  "set agentTab to selected tab of (new window)",
  "else",
  "set agentTab to new tab in front window",
  "end if",
  "set agentTerminal to focused terminal of agentTab",
  `input text ${appleScriptStringOf(command)} to agentTerminal`,
  "send key \"enter\" to agentTerminal",
  "return (id of agentTerminal) as text",
  "end tell",
])

export const ghosttyOpeningOf = (output: string, ttyPath: string): TerminalOpening => {
  const terminalId = output.trim()
  return {
    kind: "opened",
    tab: TERMINAL_ID_PATTERN.test(terminalId) ? { terminalApp: "ghostty", terminalId, ttyPath } : null,
    isWindowFallback: false,
  }
}

export const ghosttyCloseScriptArgumentsOf = (terminalId: string, tty: string): readonly string[] => {
  const agentTerminal = `terminal id ${appleScriptStringOf(terminalId)}`
  return scriptArgumentsOf([
    "tell application \"Ghostty\"",
    `if not (exists ${agentTerminal}) then return`,
    killLineOf(tty),
    ...waitUntilLinesOf(`not (exists ${agentTerminal})`, CLOSE_WAIT_STEP_SECONDS),
    `if exists ${agentTerminal} then close ${agentTerminal}`,
    "end tell",
  ])
}
