export const MAIN_BRANCH_NAMES = ["main", "master"] as const

export type MainBranchName = (typeof MAIN_BRANCH_NAMES)[number]

export interface GitFolders {
  readonly gitFolderPath: string
  readonly isMainWorktree: boolean
}

export interface RepositoryActivity extends GitFolders {
  readonly branch: MainBranchName
  readonly latestCommitAt: Date
}

const LINE_BREAK_PATTERN = /\r?\n/
const BRANCH_REF_PREFIX = "refs/heads/"

const linesOf = (output: string): readonly string[] =>
  output.split(LINE_BREAK_PATTERN).map((line) => line.trim()).filter((line) => line !== "")

export const branchRefOf = (branch: string): string => `${BRANCH_REF_PREFIX}${branch}`

export const MAIN_BRANCH_REFS: readonly string[] = MAIN_BRANCH_NAMES.map(branchRefOf)

export const authorPatternOf = (email: string): string => `<${email}>`

export const parseGitFolders = (output: string): GitFolders | null => {
  const lines = linesOf(output)
  const gitFolderPath = lines.at(1)
  const worktreeGitFolderPath = lines.at(0)
  if (gitFolderPath === undefined || worktreeGitFolderPath === undefined) return null
  return { gitFolderPath, isMainWorktree: worktreeGitFolderPath === gitFolderPath }
}

export const mainBranchOf = (output: string): MainBranchName | null => {
  const refs = new Set(linesOf(output))
  return MAIN_BRANCH_NAMES.find((branch) => refs.has(branchRefOf(branch))) ?? null
}

export const parseCommitDate = (output: string): Date | null => {
  const text = linesOf(output).at(0)
  if (text === undefined) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}
