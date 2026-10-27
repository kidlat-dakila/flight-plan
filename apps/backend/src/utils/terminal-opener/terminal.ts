import type { AgentTab, TerminalOpening } from "@/procedures/open-agent-terminal/utils/terminal-opener"
import {
  appleScriptStringOf,
  CLOSE_WAIT_STEP_SECONDS,
  killLineOf,
  scriptArgumentsOf,
  SHORT_WAIT_STEP_SECONDS,
  shortcutLineOf,
  waitLinesOf,
  waitUntilLinesOf,
} from "./apple-script"
import { TTY_SOURCE } from "./tty"

type TerminalTab = Extract<AgentTab, { terminalApp: "terminal" }>

const NEW_TAB_KEY = "t"
const CLOSE_TAB_KEY = "w"
const WINDOW_FALLBACK_TEXT = "true"
const OPENED_PATTERN = new RegExp(String.raw`^(\d+) (${TTY_SOURCE}) (true|false)$`)

const tabInFrontWindowLinesOf = (script: string): readonly string[] => [
  "set frontWindow to window id (id of front window)",
  "set tabCount to count of tabs of frontWindow",
  ...waitUntilLinesOf("frontmost", SHORT_WAIT_STEP_SECONDS),
  "try",
  shortcutLineOf(NEW_TAB_KEY),
  "on error",
  "set isWindowFallback to true",
  "end try",
  "if not isWindowFallback then",
  ...waitUntilLinesOf("(count of tabs of frontWindow) > tabCount", SHORT_WAIT_STEP_SECONDS),
  `if (count of tabs of frontWindow) > tabCount then set agentTab to do script ${script} in selected tab of frontWindow`,
  "end if",
]

export const terminalOpenScriptArgumentsOf = (command: string): readonly string[] => scriptArgumentsOf([
  "tell application \"Terminal\"",
  "activate",
  "set isWindowFallback to false",
  "set agentTab to missing value",
  "if (count of windows) > 0 then",
  ...tabInFrontWindowLinesOf(appleScriptStringOf(command)),
  "end if",
  `if agentTab is missing value then set agentTab to do script ${appleScriptStringOf(command)}`,
  "set agentTty to tty of agentTab",
  "repeat with agentWindow in windows",
  "if (tty of tabs of agentWindow) contains agentTty then return ((id of agentWindow) as text) & \" \" & agentTty & \" \" & (isWindowFallback as text)",
  "end repeat",
  "end tell",
])

export const terminalOpeningOf = (output: string): TerminalOpening => {
  const match = OPENED_PATTERN.exec(output.trim())
  return match === null
    ? { kind: "opened", tab: null, isWindowFallback: false }
    : { kind: "opened", tab: { terminalApp: "terminal", windowId: Number(match[1]), tty: match[2] }, isWindowFallback: match[3] === WINDOW_FALLBACK_TEXT }
}

const windowGoneLineOf = (tab: TerminalTab): string => `if not (exists window id ${String(tab.windowId)}) then return`

const tabGoneLineOf = (tab: TerminalTab): string => `if (tty of tabs of agentWindow) does not contain ${appleScriptStringOf(tab.tty)} then return`

const agentTabGoneLinesOf = (tab: TerminalTab): readonly string[] => [windowGoneLineOf(tab), tabGoneLineOf(tab)]

const agentTabOf = (tab: TerminalTab): string => `(first tab of agentWindow whose tty is ${appleScriptStringOf(tab.tty)})`

const closeOnlyTabLines: readonly string[] = [
  "if (count of tabs of agentWindow) is 1 then",
  "close agentWindow",
  "return",
  "end if",
]

const closeTabByShortcutLinesOf = (tab: TerminalTab): readonly string[] => [
  `set selected of ${agentTabOf(tab)} to true`,
  "set index of agentWindow to 1",
  "activate",
  ...waitUntilLinesOf("frontmost", SHORT_WAIT_STEP_SECONDS),
  `if tty of selected tab of front window is not ${appleScriptStringOf(tab.tty)} then return`,
  "try",
  shortcutLineOf(CLOSE_TAB_KEY),
  "end try",
]

export const terminalCloseScriptArgumentsOf = (tab: TerminalTab): readonly string[] => scriptArgumentsOf([
  "tell application \"Terminal\"",
  windowGoneLineOf(tab),
  `set agentWindow to window id ${String(tab.windowId)}`,
  tabGoneLineOf(tab),
  killLineOf(tab.tty),
  ...waitLinesOf(CLOSE_WAIT_STEP_SECONDS, [
    ...agentTabGoneLinesOf(tab),
    `if not (busy of ${agentTabOf(tab)}) then exit repeat`,
  ]),
  ...agentTabGoneLinesOf(tab),
  ...closeOnlyTabLines,
  ...closeTabByShortcutLinesOf(tab),
  "end tell",
])
