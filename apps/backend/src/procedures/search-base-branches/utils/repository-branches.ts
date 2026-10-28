export interface RepositoryBranch {
  readonly name: string
  readonly committedAt: Date
}

const LINE_BREAK_PATTERN = /\r?\n/
const FIELD_SEPARATOR = "\t"
const LOCAL_BRANCH_PREFIX = "refs/heads/"
const ORIGIN_BRANCH_PREFIX = "refs/remotes/origin/"
const ORIGIN_HEAD_NAME = "HEAD"
const MAIN_BRANCH_NAMES = ["main", "master"] as const

export const LISTED_BRANCH_REFS: readonly string[] = ["refs/heads", "refs/remotes/origin"]

export const BRANCH_REF_FORMAT = ["%(refname)", "%(committerdate:iso-strict)"].join("%09")

export const ORIGIN_HEAD_REF = `${ORIGIN_BRANCH_PREFIX}${ORIGIN_HEAD_NAME}`

const mainBranchCandidates: readonly (readonly [string, string])[] = [
  ...MAIN_BRANCH_NAMES.map((name) => [`${ORIGIN_BRANCH_PREFIX}${name}`, name] as const),
  ...MAIN_BRANCH_NAMES.map((name) => [`${LOCAL_BRANCH_PREFIX}${name}`, name] as const),
]

export const MAIN_BRANCH_CANDIDATE_REFS: readonly string[] = mainBranchCandidates.map(([ref]) => ref)

const linesOf = (output: string): readonly string[] =>
  output.split(LINE_BREAK_PATTERN).map((line) => line.trim()).filter((line) => line !== "")

const branchNameOf = (refName: string): string | null => {
  if (refName.startsWith(LOCAL_BRANCH_PREFIX)) return refName.slice(LOCAL_BRANCH_PREFIX.length)
  if (!refName.startsWith(ORIGIN_BRANCH_PREFIX)) return null
  const name = refName.slice(ORIGIN_BRANCH_PREFIX.length)
  return name === ORIGIN_HEAD_NAME ? null : name
}

const parseBranchRef = (line: string): RepositoryBranch | null => {
  const [refName = "", committedAtText = ""] = line.split(FIELD_SEPARATOR)
  const name = branchNameOf(refName)
  const committedAt = new Date(committedAtText)
  return name === null || name === "" || Number.isNaN(committedAt.getTime()) ? null : { name, committedAt }
}

const newerOf = (first: RepositoryBranch, second: RepositoryBranch): RepositoryBranch =>
  second.committedAt.getTime() > first.committedAt.getTime() ? second : first

const withBranch = (branches: readonly RepositoryBranch[], branch: RepositoryBranch): readonly RepositoryBranch[] =>
  branches.some((listed) => listed.name === branch.name)
    ? branches.map((listed) => (listed.name === branch.name ? newerOf(listed, branch) : listed))
    : [...branches, branch]

export const parseBranchRefs = (output: string): readonly RepositoryBranch[] =>
  linesOf(output)
    .map(parseBranchRef)
    .filter((branch) => branch !== null)
    .reduce(withBranch, [])

export const remoteHeadBranchOf = (output: string): string | null => {
  const refName = linesOf(output).at(0) ?? ""
  return refName.startsWith(ORIGIN_BRANCH_PREFIX) ? branchNameOf(refName) : null
}

export const mainBranchOf = (output: string): string | null => {
  const refs = new Set(linesOf(output))
  return mainBranchCandidates.find(([ref]) => refs.has(ref))?.[1] ?? null
}
