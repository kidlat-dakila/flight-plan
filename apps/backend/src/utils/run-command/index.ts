import { execFile } from "node:child_process"
import type { Environment } from "@/procedures/get-setup/utils/agent-folders"

export interface CommandOutcome {
  readonly exitCode: number
  readonly errorOutput: string
}

export type CommandRunner = (
  executable: string,
  commandArguments: readonly string[],
  environment: Environment,
) => Promise<CommandOutcome>

const SUCCESS_EXIT_CODE = 0
const FAILURE_EXIT_CODE = 1

const exitCodeOf = (error: Error | null): number => {
  if (error === null) return SUCCESS_EXIT_CODE
  return "code" in error && typeof error.code === "number" ? error.code : FAILURE_EXIT_CODE
}

export const runCommand: CommandRunner = async (executable, commandArguments, environment) =>
  await new Promise((resolve) => {
    execFile(executable, [...commandArguments], { env: { ...environment } }, (error, _output, errorOutput) => {
      resolve({ exitCode: exitCodeOf(error), errorOutput })
    })
  })
