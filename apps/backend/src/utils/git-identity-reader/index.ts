import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import { parseGitIdentity, type GitIdentity } from "@/procedures/get-setup/utils/git-identity"
import type { CommandRunner } from "@/utils/run-command"

const SUCCESS_EXIT_CODE = 0

export interface GitIdentityReaderOptions {
  readonly runCommand: CommandRunner
  readonly environment: Environment
}

export type GitIdentityReader = (repositoryPath: string) => Promise<GitIdentity | null>

export const createGitIdentityReader = (options: GitIdentityReaderOptions): GitIdentityReader => {
  const readSetting = async (repositoryPath: string, key: string): Promise<string | null> => {
    const outcome = await options.runCommand("git", ["-C", repositoryPath, "config", "--get", key], options.environment)
    return outcome.exitCode === SUCCESS_EXIT_CODE ? outcome.output : null
  }
  return async (repositoryPath) => {
    const [nameOutput, emailOutput] = await Promise.all([
      readSetting(repositoryPath, "user.name"),
      readSetting(repositoryPath, "user.email"),
    ])
    return parseGitIdentity(nameOutput, emailOutput)
  }
}
