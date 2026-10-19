import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import {
  authorPatternOf,
  branchRefOf,
  MAIN_BRANCH_REFS,
  mainBranchOf,
  parseCommitDate,
  parseGitFolders,
  type MainBranchName,
  type RepositoryActivity,
} from "@/procedures/list-recent-repositories/utils/repository-activity"
import type { CommandRunner } from "@/utils/run-command"

const SUCCESS_EXIT_CODE = 0

export interface RepositoryActivityReaderOptions {
  readonly runCommand: CommandRunner
  readonly environment: Environment
}

export type RepositoryActivityReader = (repositoryPath: string, authorEmail: string) => Promise<RepositoryActivity | null>

export const createRepositoryActivityReader = (options: RepositoryActivityReaderOptions): RepositoryActivityReader => {
  const runGit = async (repositoryPath: string, gitArguments: readonly string[]): Promise<string | null> => {
    const outcome = await options.runCommand("git", ["-C", repositoryPath, ...gitArguments], options.environment)
    return outcome.exitCode === SUCCESS_EXIT_CODE ? outcome.output : null
  }
  const readLatestCommitAt = async (
    repositoryPath: string,
    branch: MainBranchName,
    authorEmail: string,
  ): Promise<Date | null> => {
    const output = await runGit(repositoryPath, [
      "log",
      "-1",
      "--fixed-strings",
      "--regexp-ignore-case",
      `--author=${authorPatternOf(authorEmail)}`,
      "--format=%cI",
      branchRefOf(branch),
      "--",
    ])
    return output === null ? null : parseCommitDate(output)
  }
  return async (repositoryPath, authorEmail) => {
    const [foldersOutput, refsOutput] = await Promise.all([
      runGit(repositoryPath, ["rev-parse", "--path-format=absolute", "--git-dir", "--git-common-dir"]),
      runGit(repositoryPath, ["for-each-ref", "--format=%(refname)", ...MAIN_BRANCH_REFS]),
    ])
    const gitFolders = foldersOutput === null ? null : parseGitFolders(foldersOutput)
    const branch = refsOutput === null ? null : mainBranchOf(refsOutput)
    if (gitFolders === null || branch === null) return null
    const latestCommitAt = await readLatestCommitAt(repositoryPath, branch, authorEmail)
    return latestCommitAt === null ? null : { ...gitFolders, branch, latestCommitAt }
  }
}
