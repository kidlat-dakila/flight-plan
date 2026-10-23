import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { TerminalCloser, TerminalOpener, TerminalWindow } from "@/procedures/open-agent-terminal/utils/terminal-opener"
import type { CommandRunner } from "@/utils/run-command"

const MAC = "darwin"
const APPLE_SCRIPT_EXECUTABLE = "osascript"
const SUCCESS_EXIT_CODE = 0
const NO_REASON = "macOS gave no reason."
const DEVICE_PREFIX = "/dev/"
const CLOSE_WAIT_STEPS = 20
const CLOSE_WAIT_STEP_SECONDS = 0.25
const WINDOW_PATTERN = /^(\d+) (\/dev\/\S+)$/

export interface TerminalOpenerOptions {
  readonly platform: string
  readonly runCommand: CommandRunner
  readonly environment: Environment
}

export const appleScriptStringOf = (text: string): string => `"${text.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`

const scriptArgumentsOf = (lines: readonly string[]): readonly string[] => lines.flatMap((line) => ["-e", line])

export const terminalScriptArgumentsOf = (command: string): readonly string[] => scriptArgumentsOf([
  "tell application \"Terminal\"",
  "activate",
  `set agentTab to do script ${appleScriptStringOf(command)}`,
  "set agentTty to tty of agentTab",
  "repeat with agentWindow in windows",
  "if (tty of tabs of agentWindow) contains agentTty then return ((id of agentWindow) as text) & \" \" & agentTty",
  "end repeat",
  "end tell",
])

export const closeScriptArgumentsOf = (window: TerminalWindow): readonly string[] => scriptArgumentsOf([
  "tell application \"Terminal\"",
  `if not (exists window id ${String(window.windowId)}) then return`,
  `set agentWindow to window id ${String(window.windowId)}`,
  `if (tty of tabs of agentWindow) does not contain ${appleScriptStringOf(window.tty)} then return`,
  `do shell script ${appleScriptStringOf(`/usr/bin/pkill -t ${window.tty.slice(DEVICE_PREFIX.length)} || true`)}`,
  `repeat ${String(CLOSE_WAIT_STEPS)} times`,
  "if not (busy of tab 1 of agentWindow) then exit repeat",
  `delay ${String(CLOSE_WAIT_STEP_SECONDS)}`,
  "end repeat",
  "close agentWindow",
  "end tell",
])

export const terminalWindowOf = (output: string): TerminalWindow | null => {
  const match = WINDOW_PATTERN.exec(output.trim())
  return match === null ? null : { windowId: Number(match[1]), tty: match[2] }
}

export const createTerminalOpener = (options: TerminalOpenerOptions): TerminalOpener | null =>
  options.platform === MAC
    ? async (command) => {
      const outcome = await options.runCommand(APPLE_SCRIPT_EXECUTABLE, terminalScriptArgumentsOf(command), options.environment)
      return outcome.exitCode === SUCCESS_EXIT_CODE
        ? { kind: "opened", window: terminalWindowOf(outcome.output) }
        : { kind: "failed", reason: outcome.errorOutput.trim() === "" ? NO_REASON : outcome.errorOutput.trim() }
    }
    : null

export const createTerminalCloser = (options: TerminalOpenerOptions): TerminalCloser | null =>
  options.platform === MAC
    ? async (window) => {
      await options.runCommand(APPLE_SCRIPT_EXECUTABLE, closeScriptArgumentsOf(window), options.environment)
    }
    : null
