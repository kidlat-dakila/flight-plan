import { GitAdapterError, type Capability, type ChangedFile, type FileSearch, type GitAdapter } from "@flightplan/git-forge"

export type FakeFiles = Readonly<Record<string, string>>

export interface FakeChange {
  readonly base: FakeFiles
  readonly head: FakeFiles
}

export const BASE_COMMIT = "base-commit"
export const HEAD_COMMIT = "head-commit"

const CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>(["blob", "compare", "files", "search"])

const refuse = async (): Promise<never> => await Promise.reject(new Error("not used in this test"))

const changedFilesOf = ({ base, head }: FakeChange): ChangedFile[] => [
  ...Object.keys(head)
    .filter((path) => head[path] !== base[path])
    .map((path) => ({ path, status: path in base ? "modified" : "added" })),
  ...Object.keys(base)
    .filter((path) => !(path in head))
    .map((path) => ({ path, status: "removed" })),
]

const LINE_BY_LINE = "m"

const matchingPaths = (files: FakeFiles, { patterns, extensions }: FileSearch): string[] => {
  const expressions = patterns.map((pattern) => new RegExp(pattern, LINE_BY_LINE))
  return Object.entries(files)
    .filter(([path]) => extensions.some((extension) => path.endsWith(extension)))
    .filter(([, text]) => expressions.some((expression) => expression.test(text)))
    .map(([path]) => path)
}

export const createFakeGitAdapter = (change: FakeChange): GitAdapter => {
  const filesAt = (commit: string): FakeFiles => {
    if (commit === BASE_COMMIT) return change.base
    if (commit === HEAD_COMMIT) return change.head
    throw new GitAdapterError(`There is no commit ${commit}.`, "no-repo")
  }

  return {
    id: "git",
    name: "git",
    capabilities: CAPABILITIES,
    repo: "acme/storefront",
    supports: (capability) => CAPABILITIES.has(capability),
    reviewFilters: () => [],
    listTargets: refuse,
    target: refuse,
    listLabels: refuse,
    reviewers: refuse,
    headSha: refuse,
    diff: refuse,
    compare: async () => await Promise.resolve({ files: changedFilesOf(change), commits: 1 }),
    blob: async (path, commit) => {
      const files = filesAt(commit)
      if (!(path in files)) throw new GitAdapterError(`${path} is not in ${commit}.`, "no-repo")
      return await Promise.resolve(files[path])
    },
    listFiles: async (commit) => await Promise.resolve(Object.keys(filesAt(commit))),
    searchFiles: async (commit, search) => await Promise.resolve(matchingPaths(filesAt(commit), search)),
    permalink: () => "",
    viewer: refuse,
    searchPeople: refuse,
    listPullRequests: refuse,
    listBranches: refuse,
    branchStart: refuse,
    fetchRemotes: refuse,
  }
}
