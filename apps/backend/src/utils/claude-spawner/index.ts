import { stripVTControlCharacters } from "node:util"
import { spawn, type IPty } from "node-pty"
import { claudeLaunchArguments, spawnEnvironmentOf } from "@/procedures/deliver-to-agent/utils/claude-launch"
import type { AgentProcess } from "@/procedures/get-conversation/utils/agent-registry"
import type { AgentSpawner, AgentStart } from "@/procedures/get-conversation/utils/conversation-environment"
import { AGENT_CLI_NAMES } from "@/procedures/get-setup/utils/agent-catalog"
import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import { claudeCommandEnvironment } from "@/procedures/save-setup-step/utils/claude-plugin"
import { createExecutableFinder } from "@/utils/executable-finder"

export interface ClaudeSpawnerOptions {
  readonly homePath: string
  readonly environment: Environment
  readonly spawnPluginPath: string
  readonly exitGraceMs?: number
}

const TERMINAL_NAME = "xterm-256color"
const TERMINAL_COLUMNS = 120
const TERMINAL_ROWS = 40
const OUTPUT_TAIL_LENGTH = 20_000
const CLAUDE_MISSING_REASON = "The claude command was not found on this machine."
const EXIT_COMMAND = "/exit\r"
const DEFAULT_EXIT_GRACE_MS = 5000

const failed = (reason: string): AgentStart => ({ kind: "failed", reason })

const definedEntries = (environment: Environment): Record<string, string> =>
  Object.fromEntries(
    Object.entries(environment).filter((entry): entry is [string, string] => entry[1] !== undefined),
  )

class OutputTail {
  private text = ""

  public readonly add = (chunk: string): void => {
    this.text = `${this.text}${chunk}`.slice(-OUTPUT_TAIL_LENGTH)
  }

  public readonly read = (): string => stripVTControlCharacters(this.text)
}

class TerminalProcess implements AgentProcess {
  private readonly terminal: IPty
  private readonly output: OutputTail
  private readonly exitGraceMs: number
  private hasExited = false

  public constructor(terminal: IPty, output: OutputTail, exitGraceMs: number) {
    this.terminal = terminal
    this.output = output
    this.exitGraceMs = exitGraceMs
    terminal.onExit(() => {
      this.hasExited = true
    })
  }

  public readonly stop = (): void => {
    if (this.hasExited) return
    this.terminal.write(EXIT_COMMAND)
    setTimeout(() => {
      if (!this.hasExited) this.terminal.kill()
    }, this.exitGraceMs).unref()
  }

  public readonly readOutput = (): string => this.output.read()
}

const startReason = (error: unknown): string =>
  error instanceof Error ? `Claude could not be started: ${error.message}` : "Claude could not be started."

export const createClaudeSpawner = (options: ClaudeSpawnerOptions): AgentSpawner => {
  const findExecutable = createExecutableFinder(options)
  return async (launch, onExit) => {
    const executable = await findExecutable(AGENT_CLI_NAMES.claude)
    if (executable === null) return failed(CLAUDE_MISSING_REASON)
    const environment = claudeCommandEnvironment(launch.installPath, options.homePath, spawnEnvironmentOf(options.environment))
    try {
      const terminal = spawn(executable, [...claudeLaunchArguments(launch, options.spawnPluginPath)], {
        name: TERMINAL_NAME,
        cols: TERMINAL_COLUMNS,
        rows: TERMINAL_ROWS,
        cwd: launch.workingPath,
        env: definedEntries(environment),
      })
      const output = new OutputTail()
      terminal.onData(output.add)
      terminal.onExit(({ exitCode }) => {
        onExit({ exitCode })
      })
      return { kind: "started", process: new TerminalProcess(terminal, output, options.exitGraceMs ?? DEFAULT_EXIT_GRACE_MS) }
    } catch (error) {
      return failed(startReason(error))
    }
  }
}
