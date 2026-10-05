import {
  GitAdapterError,
  sameCommit,
  splitDiff,
  unsupported,
  type Capability,
  type FileSearch,
  type GitAdapter,
  type Remote,
} from "@flightplan/git-forge"
import { applyDiffs, type RepositoryFiles } from "./apply-diffs"

export const BASE_COMMIT = "1111111111111111111111111111111111111111"
export const HEAD_COMMIT = "2222222222222222222222222222222222222222"
export const CASE_BRANCH = "case-change"
export const CASE_REMOTE: Remote = {
  host: "forge.test",
  owner: "flight-plan",
  name: "case",
  fullName: "flight-plan/case",
}

const ADAPTER_NAME = "The case repository"
const CASE_DATE = "2026-01-01T00:00:00.000Z"
const LINE_BREAK = "\n"
const NO_PERMALINK = ""

const CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>(["blob", "compare", "headSha", "diff", "branches", "files", "search"])

export interface CaseAdapterInput {
  readonly readBaseFiles: () => Promise<RepositoryFiles>
  readonly diffs: readonly string[]
}

const refuse = (what: string) => async (): Promise<never> => await Promise.reject(unsupported(ADAPTER_NAME, what))

const unknownCommit = (commit: string): GitAdapterError =>
  new GitAdapterError(`The case repository has no commit ${commit}.`, "no-repo")

const missingFile = (path: string, commit: string): GitAdapterError =>
  new GitAdapterError(`${path} is not in the case repository at ${commit}.`, "no-repo")

const LINE_BY_LINE = "m"

const matchingPaths = (files: RepositoryFiles, { patterns, extensions }: FileSearch): string[] => {
  const expressions = patterns.map((pattern) => new RegExp(pattern, LINE_BY_LINE))
  return [...files]
    .filter(([path]) => extensions.some((extension) => path.endsWith(extension)))
    .filter(([, text]) => expressions.some((expression) => expression.test(text)))
    .map(([path]) => path)
}

export const createCaseAdapter = ({ readBaseFiles, diffs }: CaseAdapterInput): GitAdapter => {
  const filesAt = async (commit: string): Promise<RepositoryFiles> => {
    const baseFiles = await readBaseFiles()
    if (sameCommit(commit, BASE_COMMIT)) return baseFiles
    if (sameCommit(commit, HEAD_COMMIT)) return applyDiffs(baseFiles, diffs)
    throw unknownCommit(commit)
  }

  return {
    id: "git",
    name: ADAPTER_NAME,
    repo: CASE_REMOTE.fullName,
    capabilities: CAPABILITIES,
    supports: (capability) => CAPABILITIES.has(capability),
    reviewFilters: () => [],
    listTargets: refuse("list review targets"),
    target: refuse("read a review target"),
    listLabels: refuse("list labels"),
    reviewers: refuse("read reviewers"),
    viewer: refuse("read the viewer"),
    searchPeople: refuse("search people"),
    listPullRequests: refuse("list pull requests"),
    headSha: async () => await Promise.resolve(HEAD_COMMIT),
    diff: async () => await Promise.resolve(diffs.join(LINE_BREAK)),
    compare: async () => await Promise.resolve({ files: diffs.flatMap(splitDiff), commits: diffs.length }),
    blob: async (path, commit) => {
      const text = (await filesAt(commit)).get(path)
      if (text === undefined) throw missingFile(path, commit)
      return text
    },
    blobs: async (paths, commit) => {
      const files = await filesAt(commit)
      return new Map(paths.flatMap((path) => {
        const text = files.get(path)
        return text === undefined ? [] : [[path, text] as const]
      }))
    },
    listFiles: async (commit) => [...(await filesAt(commit)).keys()],
    searchFiles: async (commit, search) => matchingPaths(await filesAt(commit), search),
    permalink: () => NO_PERMALINK,
    listBranches: async () =>
      await Promise.resolve([{ name: CASE_BRANCH, sha: HEAD_COMMIT, authorEmail: "", updatedAt: CASE_DATE }]),
    branchStart: async () => await Promise.resolve(BASE_COMMIT),
    fetchRemotes: async () => {
      await Promise.resolve()
    },
  }
}
