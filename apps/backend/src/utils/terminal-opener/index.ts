import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { TerminalOpener } from "@/procedures/open-agent-terminal/utils/terminal-opener"
import type { CommandRunner } from "@/utils/run-command"

const MAC = "darwin"
const APPLE_SCRIPT_EXECUTABLE = "osascript"
const SUCCESS_EXIT_CODE = 0
const NO_REASON = "macOS gave no reason."

export interface TerminalOpenerOptions {
  readonly platform: string
  readonly runCommand: CommandRunner
  readonly environment: Environment
}

export const appleScriptStringOf = (text: string): string => `"${text.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`

export const terminalScriptArgumentsOf = (command: string): readonly string[] => [
  "-e",
  "tell application \"Terminal\" to activate",
  "-e",
  `tell application "Terminal" to do script ${appleScriptStringOf(command)}`,
]

export const createTerminalOpener = (options: TerminalOpenerOptions): TerminalOpener | null =>
  options.platform === MAC
    ? async (command) => {
      const outcome = await options.runCommand(APPLE_SCRIPT_EXECUTABLE, terminalScriptArgumentsOf(command), options.environment)
      return outcome.exitCode === SUCCESS_EXIT_CODE
        ? { kind: "opened" }
        : { kind: "failed", reason: outcome.errorOutput.trim() === "" ? NO_REASON : outcome.errorOutput.trim() }
    }
    : null
