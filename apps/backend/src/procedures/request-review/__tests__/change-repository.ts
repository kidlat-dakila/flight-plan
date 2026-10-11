import type { RecordedChange } from "@/procedures/get-review/utils/change-reader"
import type { RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import { GitAdapterError, splitDiff, type Capability, type FileSearch, type GitAdapter } from "@flightplan/git-forge"

export interface ChangeRepository {
  readonly change: RecordedChange
  readonly baseTexts: Readonly<Record<string, string>>
}

type Texts = ReadonlyMap<string, string>

const CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>(["blob", "compare", "headSha", "diff", "files", "search"])
const LINE_BY_LINE = "m"

const refuse = async (): Promise<never> => await Promise.reject(new Error("The request does not read this."))

const missingBranch = (name: string): GitAdapterError =>
  new GitAdapterError(`${name} is not in this checkout. Fetch it and try again.`, "no-repo")

const matchingPaths = (texts: Texts, { patterns, extensions }: FileSearch): string[] => {
  const expressions = patterns.map((pattern) => new RegExp(pattern, LINE_BY_LINE))
  return [...texts]
    .filter(([path]) => extensions.some((extension) => path.endsWith(extension)))
    .filter(([, text]) => expressions.some((expression) => expression.test(text)))
    .map(([path]) => path)
}

const createChangeAdapter = ({ change, baseTexts }: ChangeRepository): GitAdapter => {
  const textsAt = (commit: string): Texts =>
    new Map(Object.entries(commit === change.revision.headCommit ? change.texts : baseTexts))
  const commitOf = async (name: string, commit: string): Promise<string> =>
    name === change.branchName ? await Promise.resolve(commit) : await Promise.reject(missingBranch(name))

  return {
    id: "git",
    name: "git",
    repo: "",
    capabilities: CAPABILITIES,
    supports: (capability) => CAPABILITIES.has(capability),
    reviewFilters: () => [],
    listTargets: refuse,
    target: refuse,
    listLabels: refuse,
    reviewers: refuse,
    viewer: refuse,
    searchPeople: refuse,
    listPullRequests: refuse,
    listBranches: refuse,
    branchStart: refuse,
    fetchRemotes: refuse,
    permalink: () => "",
    headSha: async (ref) => await commitOf(ref.kind === "branch" ? ref.name : "", change.revision.headCommit),
    baseSha: async (ref) => await commitOf(ref.kind === "branch" ? ref.name : "", change.revision.baseCommit),
    diff: async () => await Promise.resolve(change.diff),
    compare: async () => await Promise.resolve({ files: splitDiff(change.diff), commits: 1 }),
    blob: async (path, commit) => {
      const text = textsAt(commit).get(path)
      return text === undefined ? await Promise.reject(missingBranch(path)) : await Promise.resolve(text)
    },
    blobs: async (paths, commit) => {
      const texts = textsAt(commit)
      return await Promise.resolve(new Map(paths.flatMap((path) => {
        const text = texts.get(path)
        return text === undefined ? [] : [[path, text] as const]
      })))
    },
    listFiles: async (commit) => await Promise.resolve([...textsAt(commit).keys()]),
    searchFiles: async (commit, search) => await Promise.resolve(matchingPaths(textsAt(commit), search)),
  }
}

export const createChangeRepositoryOpener = (repositories: readonly ChangeRepository[]): RepositoryAdapterOpener =>
  async (path) => {
    const repository = repositories.find((candidate) => candidate.change.repositoryPath === path)
    const resolved = repository === undefined
      ? { ok: false as const, error: new GitAdapterError("This folder is not a git repository.", "no-repo"), repo: "" }
      : { ok: true as const, gitAdapter: createChangeAdapter(repository), repo: "" }
    return await Promise.resolve({ forge: "git", adapterName: "git", forgeSlug: null, resolved })
  }
