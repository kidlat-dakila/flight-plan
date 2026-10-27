import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import {
  BRANCH_REF_FORMAT,
  LISTED_BRANCH_REFS,
  MAIN_BRANCH_CANDIDATE_REFS,
  mainBranchOf,
  ORIGIN_HEAD_REF,
  parseBranchRefs,
  remoteHeadBranchOf,
  type RepositoryBranch,
} from "@/procedures/search-base-branches/utils/repository-branches"
import type { CommandRunner } from "@/utils/run-command"

const SUCCESS_EXIT_CODE = 0

export interface BaseBranchReaderOptions {
  readonly runCommand: CommandRunner
  readonly environment: Environment
}

export interface BaseBranchReader {
  readonly detectMainBranch: (repositoryPath: string) => Promise<string | null>
  readonly listBranches: (repositoryPath: string) => Promise<readonly RepositoryBranch[] | null>
}

export const createBaseBranchReader = (options: BaseBranchReaderOptions): BaseBranchReader => {
  const runGit = async (repositoryPath: string, gitArguments: readonly string[]): Promise<string | null> => {
    const outcome = await options.runCommand("git", ["-C", repositoryPath, ...gitArguments], options.environment)
    return outcome.exitCode === SUCCESS_EXIT_CODE ? outcome.output : null
  }
  const readRemoteHeadBranch = async (repositoryPath: string): Promise<string | null> => {
    const output = await runGit(repositoryPath, ["symbolic-ref", "--quiet", ORIGIN_HEAD_REF])
    return output === null ? null : remoteHeadBranchOf(output)
  }
  const readMainBranch = async (repositoryPath: string): Promise<string | null> => {
    const output = await runGit(repositoryPath, ["for-each-ref", "--format=%(refname)", ...MAIN_BRANCH_CANDIDATE_REFS])
    return output === null ? null : mainBranchOf(output)
  }
  return {
    detectMainBranch: async (repositoryPath) =>
      (await readRemoteHeadBranch(repositoryPath)) ?? (await readMainBranch(repositoryPath)),
    listBranches: async (repositoryPath) => {
      const output = await runGit(repositoryPath, ["for-each-ref", `--format=${BRANCH_REF_FORMAT}`, ...LISTED_BRANCH_REFS])
      return output === null ? null : parseBranchRefs(output)
    },
  }
}
