import { constants } from "node:fs"
import { access } from "node:fs/promises"
import { AGENT_CLI_NAMES } from "@/procedures/get-setup/utils/agent-catalog"
import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { executableCandidates } from "@/procedures/save-setup-step/utils/executable-candidates"

export interface ExecutableFinderOptions {
  readonly homePath: string
  readonly environment: Environment
}

export type ExecutableFinder = (name: string) => Promise<string | null>

const isExecutable = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

export const createExecutableFinder = (options: ExecutableFinderOptions): ExecutableFinder =>
  async (name) => {
    const candidates = executableCandidates(name, options.environment.PATH, options.homePath)
    const checks = await Promise.all(candidates.map(isExecutable))
    return candidates.find((_candidate, index) => checks[index]) ?? null
  }

export const createAgentCliProbe = (options: ExecutableFinderOptions): SetupEnvironment["hasAgentCli"] => {
  const findExecutable = createExecutableFinder(options)
  return async (agent) => (await findExecutable(AGENT_CLI_NAMES[agent])) !== null
}
