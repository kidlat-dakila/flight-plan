import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { TerminalApp } from "@/procedures/get-setup/utils/setup"
import type { AgentTab, TerminalCloser, TerminalOpener, TerminalOpening } from "@/procedures/open-agent-terminal/utils/terminal-opener"
import type { CommandOutcome, CommandRunner } from "@/utils/run-command"
import { APPLE_SCRIPT_EXECUTABLE } from "./apple-script"
import { ghosttyCloseScriptArgumentsOf, ghosttyOpeningOf, ghosttyOpenScriptArgumentsOf } from "./ghostty"
import { itermCloseScriptArgumentsOf, itermOpeningOf, itermOpenScriptArgumentsOf } from "./iterm"
import { terminalCloseScriptArgumentsOf, terminalOpeningOf, terminalOpenScriptArgumentsOf } from "./terminal"
import { deviceNameOf, ttyOf, ttyPathOf, ttyRecordingCommandOf } from "./tty"
import { WARP_TAB_CONFIG_URL, warpOpeningOf, warpTabConfigOf, warpTabConfigPathOf } from "./warp"

const MAC = "darwin"
const OPEN_EXECUTABLE = "open"
const KILL_EXECUTABLE = "/usr/bin/pkill"
const SUCCESS_EXIT_CODE = 0
const NO_REASON = "macOS gave no reason."

export interface TerminalFiles {
  readonly write: (path: string, text: string) => Promise<void>
  readonly read: (path: string) => Promise<string | null>
  readonly remove: (path: string) => Promise<void>
}

export interface TerminalOpenerOptions {
  readonly platform: string
  readonly runCommand: CommandRunner
  readonly environment: Environment
  readonly homePath: string
  readonly temporaryPath: string
  readonly newId: () => string
  readonly files: TerminalFiles
}

type AppOpener = (options: TerminalOpenerOptions, command: string) => Promise<TerminalOpening>

const failedOf = (reason: string): TerminalOpening => ({ kind: "failed", reason: reason.trim() === "" ? NO_REASON : reason.trim() })

const reasonOf = (failure: unknown): string => (failure instanceof Error ? failure.message : NO_REASON)

const openingOf = (outcome: CommandOutcome, openedOf: (output: string) => TerminalOpening): TerminalOpening =>
  outcome.exitCode === SUCCESS_EXIT_CODE ? openedOf(outcome.output) : failedOf(outcome.errorOutput)

const runScript = async (options: TerminalOpenerOptions, scriptArguments: readonly string[]): Promise<CommandOutcome> =>
  await options.runCommand(APPLE_SCRIPT_EXECUTABLE, scriptArguments, options.environment)

const newTtyPathOf = (options: TerminalOpenerOptions): string => ttyPathOf(options.temporaryPath, options.newId())

const openInTerminal: AppOpener = async (options, command) =>
  openingOf(await runScript(options, terminalOpenScriptArgumentsOf(command)), terminalOpeningOf)

const openInIterm: AppOpener = async (options, command) =>
  openingOf(await runScript(options, itermOpenScriptArgumentsOf(command)), itermOpeningOf)

const openInGhostty: AppOpener = async (options, command) => {
  const ttyPath = newTtyPathOf(options)
  const outcome = await runScript(options, ghosttyOpenScriptArgumentsOf(ttyRecordingCommandOf(command, ttyPath)))
  return openingOf(outcome, (output) => ghosttyOpeningOf(output, ttyPath))
}

const writeWarpTabConfig = async (options: TerminalOpenerOptions, command: string): Promise<string | null> =>
  await options.files.write(warpTabConfigPathOf(options.homePath), warpTabConfigOf(command)).then(() => null, reasonOf)

const openInWarp: AppOpener = async (options, command) => {
  const ttyPath = newTtyPathOf(options)
  const writeFailure = await writeWarpTabConfig(options, ttyRecordingCommandOf(command, ttyPath))
  if (writeFailure !== null) return failedOf(writeFailure)
  const outcome = await options.runCommand(OPEN_EXECUTABLE, [WARP_TAB_CONFIG_URL], options.environment)
  return openingOf(outcome, () => warpOpeningOf(ttyPath))
}

const APP_OPENERS: Record<TerminalApp, AppOpener> = {
  terminal: openInTerminal,
  iterm: openInIterm,
  ghostty: openInGhostty,
  warp: openInWarp,
}

const recordedTtyOf = async (options: TerminalOpenerOptions, ttyPath: string): Promise<string | null> => {
  const text = await options.files.read(ttyPath).catch(() => null)
  return text === null ? null : ttyOf(text)
}

const endRecordedTab = async (options: TerminalOpenerOptions, ttyPath: string, end: (tty: string) => Promise<unknown>): Promise<void> => {
  const tty = await recordedTtyOf(options, ttyPath)
  if (tty !== null) await end(tty)
  await options.files.remove(ttyPath).catch(() => undefined)
}

const closeTab = async (options: TerminalOpenerOptions, tab: AgentTab): Promise<void> => {
  switch (tab.terminalApp) {
    case "terminal":
      await runScript(options, terminalCloseScriptArgumentsOf(tab))
      return
    case "iterm":
      await runScript(options, itermCloseScriptArgumentsOf(tab))
      return
    case "ghostty":
      await endRecordedTab(options, tab.ttyPath, async (tty) => await runScript(options, ghosttyCloseScriptArgumentsOf(tab.terminalId, tty)))
      return
    case "warp":
      await endRecordedTab(options, tab.ttyPath, async (tty) => await options.runCommand(KILL_EXECUTABLE, ["-t", deviceNameOf(tty)], options.environment))
  }
}

export const createTerminalOpener = (options: TerminalOpenerOptions): TerminalOpener | null =>
  options.platform === MAC ? async (command, terminalApp) => await APP_OPENERS[terminalApp](options, command) : null

export const createTerminalCloser = (options: TerminalOpenerOptions): TerminalCloser | null =>
  options.platform === MAC ? async (tab) => { await closeTab(options, tab) } : null
