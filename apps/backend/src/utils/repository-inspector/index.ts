import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { ForgesChoice, SetupForge } from "@/procedures/get-setup/utils/setup"
import type { RepositoryInspection } from "@/procedures/list-repositories/utils/build-repository"
import {
  PULL_REQUESTS_PER_AUTHOR,
  toForgePullRequest,
  type ForgeSnapshot,
} from "@/procedures/list-repositories/utils/forge-pull-request"
import { isTrackedBranch, toLocalBranch, type LocalBranch } from "@/procedures/list-repositories/utils/local-branch"
import type { RepositoryProblem } from "@/procedures/list-repositories/utils/repository"
import type { ForgeCredentialReader } from "@/utils/forge-credential-reader"
import { createRepositoryAdapterOpener, repositoryProblemOf, type RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import type { BranchTip, GitAdapterInput, Resolved, Remote, GitAdapter } from "@flightplan/git-forge"

const FORGE_CACHE_MS = 120_000
const FETCH_INTERVAL_MS = 300_000

export interface InspectionRequest {
  readonly path: string
  readonly forges: ForgesChoice | null
  readonly trackedAuthorIds: readonly string[]
  readonly selfAuthorId: string | null
  readonly addedBranchNames: readonly string[]
  readonly addedPullRequestAuthors: readonly string[]
}

export interface InspectorDependencies {
  readonly readRemote: (path: string) => Promise<Remote | null>
  readonly openAdapter: (input: GitAdapterInput) => Promise<Resolved>
  readonly readCredential: ForgeCredentialReader
  readonly environment: Environment
  readonly now: () => Date
}

type ForgeOutcome
  = | { readonly kind: "fetched", readonly snapshot: ForgeSnapshot }
    | { readonly kind: "failed", readonly problem: RepositoryProblem }

interface CachedOutcome {
  readonly path: string
  readonly fetchedAt: number
  readonly outcome: Promise<ForgeOutcome>
}

const isListedBranch = (tip: BranchTip, trackedAuthorIds: readonly string[], addedBranchNames: readonly string[]): boolean =>
  isTrackedBranch(tip, trackedAuthorIds) || addedBranchNames.includes(tip.name)

const UNSUPPORTED_PROBLEM: RepositoryProblem = { kind: "unsupported", detail: null }

const failedInspection = (base: Pick<RepositoryInspection, "forge" | "forgeSlug">, problem: RepositoryProblem): RepositoryInspection => ({
  ...base,
  problem,
  snapshot: null,
  branches: [],
})

export class RepositoryInspector {
  private readonly dependencies: InspectorDependencies
  private readonly openRepository: RepositoryAdapterOpener
  private cachedOutcomes: ReadonlyMap<string, CachedOutcome> = new Map()
  private fetchedAt: ReadonlyMap<string, number> = new Map()

  public constructor(dependencies: InspectorDependencies) {
    this.dependencies = dependencies
    this.openRepository = createRepositoryAdapterOpener(dependencies)
  }

  public readonly inspect = async (request: InspectionRequest): Promise<RepositoryInspection> => {
    const opened = await this.openRepository(request.path, request.forges)
    const base = { forge: opened.adapterName, forgeSlug: opened.forgeSlug }
    if (!opened.resolved.ok) return failedInspection(base, repositoryProblemOf(opened.resolved.error))
    return base.forge === "git"
      ? await this.inspectBranches(opened.resolved.gitAdapter, base, request)
      : await this.inspectForge(opened.resolved.gitAdapter, base, request, opened.forge)
  }

  public readonly forget = (path: string): void => {
    this.cachedOutcomes = new Map([...this.cachedOutcomes].filter(([, cached]) => cached.path !== path))
  }

  private readonly inspectBranches = async (
    adapter: GitAdapter,
    base: Pick<RepositoryInspection, "forge" | "forgeSlug">,
    request: InspectionRequest,
  ): Promise<RepositoryInspection> => {
    this.fetchInBackgroundWhenDue(adapter, request.path)
    try {
      const trackedAuthorIds = request.selfAuthorId === null ? request.trackedAuthorIds : [...request.trackedAuthorIds, request.selfAuthorId]
      const tips = (await adapter.listBranches()).filter((tip) => isListedBranch(tip, trackedAuthorIds, request.addedBranchNames))
      const starts = await Promise.all(tips.map(async (tip) => await adapter.branchStart(tip.name)))
      const branches: LocalBranch[] = tips.map((tip, position) => toLocalBranch(tip, starts[position]?.startedAt ?? null))
      return { ...base, problem: null, snapshot: null, branches }
    } catch (error) {
      return failedInspection(base, repositoryProblemOf(error))
    }
  }

  private readonly inspectForge = async (
    adapter: GitAdapter,
    base: Pick<RepositoryInspection, "forge" | "forgeSlug">,
    request: InspectionRequest,
    forge: SetupForge,
  ): Promise<RepositoryInspection> => {
    const [outcome, branches] = await Promise.all([
      this.cachedForgeOutcome(adapter, request, forge),
      this.readAddedBranches(adapter, request.addedBranchNames),
    ])
    return outcome.kind === "failed"
      ? failedInspection(base, outcome.problem)
      : { ...base, problem: null, snapshot: outcome.snapshot, branches }
  }

  private readonly readAddedBranches = async (
    adapter: GitAdapter,
    addedBranchNames: readonly string[],
  ): Promise<readonly LocalBranch[]> => {
    if (addedBranchNames.length === 0) return []
    try {
      const tips = await adapter.listBranches()
      return tips.filter((tip) => addedBranchNames.includes(tip.name)).map((tip) => toLocalBranch(tip, null))
    } catch {
      return []
    }
  }

  private readonly cachedForgeOutcome = async (
    adapter: GitAdapter,
    request: InspectionRequest,
    forge: SetupForge,
  ): Promise<ForgeOutcome> => {
    const key = [request.path, forge, ...[...request.trackedAuthorIds, ...request.addedPullRequestAuthors].sort()].join("\n")
    const now = this.dependencies.now().getTime()
    const cached = this.cachedOutcomes.get(key)
    if (cached !== undefined && now - cached.fetchedAt < FORGE_CACHE_MS) return await cached.outcome
    const outcome = this.fetchForge(adapter, request)
    this.cachedOutcomes = new Map([...this.cachedOutcomes, [key, { path: request.path, fetchedAt: now, outcome }]])
    return await outcome
  }

  private readonly fetchForge = async (adapter: GitAdapter, request: InspectionRequest): Promise<ForgeOutcome> => {
    if (!adapter.supports("history")) return { kind: "failed", problem: UNSUPPORTED_PROBLEM }
    try {
      const viewer = await adapter.viewer()
      const histories = await adapter.listPullRequests({
        authors: [...new Set([viewer.login, ...request.trackedAuthorIds, ...request.addedPullRequestAuthors])],
        limit: PULL_REQUESTS_PER_AUTHOR,
      })
      return { kind: "fetched", snapshot: { viewerLogin: viewer.login, pullRequests: histories.map(toForgePullRequest) } }
    } catch (error) {
      return { kind: "failed", problem: repositoryProblemOf(error) }
    }
  }

  private readonly fetchInBackgroundWhenDue = (adapter: GitAdapter, path: string): void => {
    const now = this.dependencies.now().getTime()
    const lastFetchedAt = this.fetchedAt.get(path)
    if (lastFetchedAt !== undefined && now - lastFetchedAt < FETCH_INTERVAL_MS) return
    this.fetchedAt = new Map([...this.fetchedAt, [path, now]])
    adapter.fetchRemotes().catch(() => undefined)
  }
}
