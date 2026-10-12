import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { BranchPull, BranchPuller } from "@/procedures/rebuild-review/utils/branch-puller"
import type { CommandOutcome, CommandRunner } from "@/utils/run-command"

export interface BranchPullerOptions {
  readonly runCommand: CommandRunner
  readonly environment: Environment
}

const GIT = "git"
const REMOTE = "origin"
const SUCCESS_EXIT_CODE = 0
const LINE_BREAK = "\n"
const OPTION_PREFIX = "-"
const NO_PROMPT_ENVIRONMENT = { GIT_TERMINAL_PROMPT: "0" }
const FATAL_PREFIX_PATTERN = /^(?:fatal|error): /
const PULLED: BranchPull = { kind: "pulled" }
const LOCAL_ONLY: BranchPull = { kind: "local-only" }

const localRefOf = (branchName: string): string => `refs/heads/${branchName}`
const remoteRefOf = (branchName: string): string => `refs/remotes/${REMOTE}/${branchName}`

const hasSucceeded = (outcome: CommandOutcome): boolean => outcome.exitCode === SUCCESS_EXIT_CODE

const reasonOf = (outcome: CommandOutcome): string => {
  const lines = outcome.errorOutput.split(LINE_BREAK).map((line) => line.trim()).filter((line) => line !== "")
  const lastLine = lines.at(-1)
  return lastLine === undefined
    ? `git exited with code ${String(outcome.exitCode)}.`
    : lastLine.replace(FATAL_PREFIX_PATTERN, "")
}

const failed = (outcome: CommandOutcome): BranchPull => ({ kind: "failed", reason: reasonOf(outcome) })

export const createBranchPuller = ({ runCommand, environment }: BranchPullerOptions): BranchPuller => {
  const runGit = async (repositoryPath: string, gitArguments: readonly string[]): Promise<CommandOutcome> =>
    await runCommand(GIT, ["-C", repositoryPath, ...gitArguments], { ...environment, ...NO_PROMPT_ENVIRONMENT })

  const advance = async (repositoryPath: string, branchName: string): Promise<CommandOutcome> => {
    const checkedOut = await runGit(repositoryPath, ["symbolic-ref", "--quiet", "--short", "HEAD"])
    return hasSucceeded(checkedOut) && checkedOut.output.trim() === branchName
      ? await runGit(repositoryPath, ["merge", "--ff-only", "--quiet", remoteRefOf(branchName)])
      : await runGit(repositoryPath, ["fetch", "--quiet", ".", `${remoteRefOf(branchName)}:${localRefOf(branchName)}`])
  }

  return async (repositoryPath, branchName) => {
    if (branchName === "" || branchName.startsWith(OPTION_PREFIX)) return LOCAL_ONLY
    const remote = await runGit(repositoryPath, ["remote", "get-url", REMOTE])
    if (!hasSucceeded(remote)) return LOCAL_ONLY
    const fetched = await runGit(repositoryPath, ["fetch", "--quiet", REMOTE, branchName])
    if (!hasSucceeded(fetched)) return failed(fetched)
    const local = await runGit(repositoryPath, ["rev-parse", "--verify", "--quiet", `${localRefOf(branchName)}^{commit}`])
    if (!hasSucceeded(local)) return PULLED
    const isAhead = await runGit(repositoryPath, ["merge-base", "--is-ancestor", remoteRefOf(branchName), localRefOf(branchName)])
    if (hasSucceeded(isAhead)) return PULLED
    const advanced = await advance(repositoryPath, branchName)
    return hasSucceeded(advanced) ? PULLED : failed(advanced)
  }
}
