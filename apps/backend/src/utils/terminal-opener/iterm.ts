import type { AgentTab, TerminalOpening } from "@/procedures/open-agent-terminal/utils/terminal-opener"
import { appleScriptStringOf, CLOSE_WAIT_STEP_SECONDS, killLineOf, scriptArgumentsOf, waitLinesOf } from "./apple-script"
import { ttyOf } from "./tty"

type ItermTab = Extract<AgentTab, { terminalApp: "iterm" }>

export const itermOpenScriptArgumentsOf = (command: string): readonly string[] => scriptArgumentsOf([
  "tell application \"iTerm\"",
  "activate",
  "if current window is missing value then",
  "set agentSession to current session of (create window with default profile)",
  "else",
  "tell current window to set agentSession to current session of (create tab with default profile)",
  "end if",
  `tell agentSession to write text ${appleScriptStringOf(command)}`,
  "return tty of agentSession",
  "end tell",
])

export const itermOpeningOf = (output: string): TerminalOpening => {
  const tty = ttyOf(output)
  return { kind: "opened", tab: tty === null ? null : { terminalApp: "iterm", tty }, isWindowFallback: false }
}

const forAgentSessionLinesOf = (tab: ItermTab, matchLines: readonly string[]): readonly string[] => [
  "repeat with agentWindow in windows",
  "repeat with agentTab in tabs of agentWindow",
  "repeat with agentSession in sessions of agentTab",
  `if tty of agentSession is ${appleScriptStringOf(tab.tty)} then`,
  ...matchLines,
  "end if",
  "end repeat",
  "end repeat",
  "end repeat",
]

export const itermCloseScriptArgumentsOf = (tab: ItermTab): readonly string[] => scriptArgumentsOf([
  "tell application \"iTerm\"",
  "set isAgentOpen to false",
  ...forAgentSessionLinesOf(tab, ["set isAgentOpen to true"]),
  "if not isAgentOpen then return",
  killLineOf(tab.tty),
  ...waitLinesOf(CLOSE_WAIT_STEP_SECONDS, [
    "set isAgentBusy to false",
    ...forAgentSessionLinesOf(tab, ["set isAgentBusy to is processing of agentSession"]),
    "if not isAgentBusy then exit repeat",
  ]),
  ...forAgentSessionLinesOf(tab, ["close agentSession", "return"]),
  "end tell",
])
