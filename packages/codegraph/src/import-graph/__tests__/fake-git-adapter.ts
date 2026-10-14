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

const LINE_BREAK = "\n"

const sharedLineCount = (before: readonly string[], after: readonly string[]): number => {
  const firstDifference = before.findIndex((line, index) => line !== after[index])
  return firstDifference === -1 ? before.length : firstDifference
}

const patchOf = (baseText: string | undefined, headText: string): string => {
  const before = baseText === undefined ? [] : baseText.split(LINE_BREAK)
  const after = headText.split(LINE_BREAK)
  const leading = Math.min(sharedLineCount(before, after), after.length)
  const trailing = Math.min(sharedLineCount([...before.slice(leading)].reverse(), [...after.slice(leading)].reverse()), after.length - leading)
  const removed = before.slice(leading, before.length - trailing)
  const added = after.slice(leading, after.length - trailing)
  const header = `@@ -${String(leading + 1)},${String(removed.length)} +${String(added.length === 0 ? leading : leading + 1)},${String(added.length)} @@`
  return [header, ...removed.map((line) => `-${line}`), ...added.map((line) => `+${line}`)].join(LINE_BREAK)
}

const changedFilesOf = ({ base, head }: FakeChange): ChangedFile[] => [
  ...Object.keys(head)
    .filter((path) => head[path] !== base[path])
    .map((path) => ({ path, status: path in base ? "modified" : "added", patch: patchOf(base[path], head[path]) })),
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
    headSha: async () => await Promise.resolve(HEAD_COMMIT),
    baseSha: async () => await Promise.resolve(BASE_COMMIT),
    diff: refuse,
    compare: async () => await Promise.resolve({ files: changedFilesOf(change), commits: 1 }),
    blob: async (path, commit) => {
      const files = filesAt(commit)
      if (!(path in files)) throw new GitAdapterError(`${path} is not in ${commit}.`, "no-repo")
      return await Promise.resolve(files[path])
    },
    blobs: async (paths, commit) => {
      const files = filesAt(commit)
      return await Promise.resolve(new Map(paths.filter((path) => path in files).map((path) => [path, files[path]] as const)))
    },
    listFiles: async (commit) => await Promise.resolve(Object.keys(filesAt(commit))),
    searchFiles: async (commit, search) => await Promise.resolve(matchingPaths(filesAt(commit), search)),
    permalink: () => "",
    viewer: refuse,
    searchPeople: refuse,
    reviewVerdicts: () => [],
    discussion: refuse,
    submitReview: refuse,
    addComment: refuse,
    replyToThread: refuse,
    resolveThread: refuse,
    reopenThread: refuse,
    searchReviewers: refuse,
    requestReviewers: refuse,
    removeReviewRequests: refuse,
    listPullRequests: refuse,
    listRecentPullRequests: refuse,
    listBranches: refuse,
    branchStart: refuse,
    fetchRemotes: refuse,
  }
}
