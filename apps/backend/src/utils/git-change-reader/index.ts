import type { ChangeReader, ChangeRevision } from "@/procedures/get-review/utils/change-reader"
import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { CommandRunner } from "@/utils/run-command"

export interface GitChangeReaderOptions {
  readonly runCommand: CommandRunner
  readonly environment: Environment
}

const GIT = "git"
const SUCCESS_EXIT_CODE = 0
const LINE_BREAK = "\n"
const NULL_SEPARATOR = "\0"
const PATH_SEGMENT_PATTERN = /[\\/]/
const DRIVE_PREFIX_PATTERN = /^[A-Za-z]:/
const PARENT_SEGMENT = ".."

const MAINLINE_REFS = [
  "refs/remotes/origin/HEAD",
  "refs/remotes/origin/main",
  "refs/remotes/origin/master",
  "refs/remotes/origin/trunk",
  "refs/heads/main",
  "refs/heads/master",
  "refs/heads/trunk",
] as const

const headRefsOf = (branchName: string): readonly string[] => [
  `refs/heads/${branchName}`,
  `refs/remotes/origin/${branchName}`,
]

const baseRefsOf = (baseBranch: string | null): readonly string[] =>
  baseBranch === null ? MAINLINE_REFS : [`refs/remotes/origin/${baseBranch}`, `refs/heads/${baseBranch}`]

const isConfinedPath = (path: string): boolean =>
  path !== ""
  && !path.startsWith("/")
  && !path.startsWith("-")
  && !DRIVE_PREFIX_PATTERN.test(path)
  && !path.split(PATH_SEGMENT_PATTERN).includes(PARENT_SEGMENT)

const rangeOf = (revision: ChangeRevision): string => `${revision.baseCommit}...${revision.headCommit}`

export const createGitChangeReader = ({ runCommand, environment }: GitChangeReaderOptions): ChangeReader => {
  const runGit = async (repositoryPath: string, gitArguments: readonly string[]): Promise<string | null> => {
    const outcome = await runCommand(GIT, ["-C", repositoryPath, ...gitArguments], environment)
    return outcome.exitCode === SUCCESS_EXIT_CODE ? outcome.output : null
  }

  const findCommit = async (repositoryPath: string, refs: readonly string[]): Promise<string | null> => {
    const commits = await Promise.all(
      refs.map(async (ref) => await runGit(repositoryPath, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`])),
    )
    return commits.map((commit) => commit?.trim() ?? "").find((commit) => commit !== "") ?? null
  }

  return {
    findRevision: async (repositoryPath, branchName, baseBranch) => {
      const [headCommit, baseCommit] = await Promise.all([
        findCommit(repositoryPath, headRefsOf(branchName)),
        findCommit(repositoryPath, baseRefsOf(baseBranch)),
      ])
      return headCommit === null || baseCommit === null ? null : { headCommit, baseCommit }
    },
    readDiff: async (repositoryPath, revision) =>
      await runGit(repositoryPath, ["diff", "--no-color", "--no-ext-diff", "--no-renames", "--unified=0", rangeOf(revision)]),
    listChangedPaths: async (repositoryPath, revision) => {
      const output = await runGit(repositoryPath, ["diff", "--name-only", "--no-renames", rangeOf(revision)])
      return output === null ? null : output.split(LINE_BREAK).filter((path) => path !== "")
    },
    listPaths: async (repositoryPath, commit) => {
      const output = await runGit(repositoryPath, ["ls-tree", "-r", "-z", "--name-only", commit])
      return output === null ? null : output.split(NULL_SEPARATOR).filter((path) => path !== "")
    },
    readFile: async (repositoryPath, commit, path) =>
      isConfinedPath(path) ? await runGit(repositoryPath, ["cat-file", "blob", `${commit}:${path}`]) : null,
  }
}
