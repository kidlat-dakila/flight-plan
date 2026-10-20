import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import { parseGitIdentity, type GitIdentity } from "@/procedures/get-setup/utils/git-identity"
import type { CommandRunner } from "@/utils/run-command"

const SUCCESS_EXIT_CODE = 0
const GLOBAL_CONFIG_ARGUMENTS: readonly string[] = ["config", "--global"]

export interface GitIdentityReaderOptions {
  readonly runCommand: CommandRunner
  readonly environment: Environment
}

export type GitIdentityReader = (repositoryPath: string) => Promise<GitIdentity | null>

const repositoryConfigArguments = (repositoryPath: string): readonly string[] => ["-C", repositoryPath, "config"]

export const createGitIdentityReader = (options: GitIdentityReaderOptions): GitIdentityReader => {
  const readSetting = async (configArguments: readonly string[], key: string): Promise<string | null> => {
    const outcome = await options.runCommand("git", [...configArguments, "--get", key], options.environment)
    return outcome.exitCode === SUCCESS_EXIT_CODE ? outcome.output : null
  }
  const readIdentity = async (configArguments: readonly string[]): Promise<GitIdentity | null> => {
    const [nameOutput, emailOutput] = await Promise.all([
      readSetting(configArguments, "user.name"),
      readSetting(configArguments, "user.email"),
    ])
    return parseGitIdentity(nameOutput, emailOutput)
  }
  return async (repositoryPath) =>
    await readIdentity(repositoryConfigArguments(repositoryPath)) ?? await readIdentity(GLOBAL_CONFIG_ARGUMENTS)
}
