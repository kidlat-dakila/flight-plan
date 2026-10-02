import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { RepositoryAuthor } from "@/procedures/get-setup/utils/setup"
import { COMMIT_AUTHOR_SEPARATOR, parseCommitAuthors } from "@/procedures/search-repository-authors/utils/parse-commit-authors"
import type { CommandRunner } from "@/utils/run-command"

const SUCCESS_EXIT_CODE = 0
const AUTHOR_FORMAT = `%aN${COMMIT_AUTHOR_SEPARATOR}%aE`

export interface CommitAuthorReaderOptions {
  readonly runCommand: CommandRunner
  readonly environment: Environment
  readonly commitLimit: number
}

export type CommitAuthorReader = (repositoryPath: string) => Promise<readonly RepositoryAuthor[]>

export const createCommitAuthorReader = (options: CommitAuthorReaderOptions): CommitAuthorReader =>
  async (repositoryPath) => {
    const logArguments = ["-C", repositoryPath, "log", `--max-count=${String(options.commitLimit)}`, `--format=${AUTHOR_FORMAT}`]
    const outcome = await options.runCommand("git", logArguments, options.environment)
    return outcome.exitCode === SUCCESS_EXIT_CODE ? parseCommitAuthors(outcome.output) : []
  }
