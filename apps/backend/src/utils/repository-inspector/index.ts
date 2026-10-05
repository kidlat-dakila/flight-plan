import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { ForgesChoice, SetupForge } from "@/procedures/get-setup/utils/setup"
import type { RepositoryInspection } from "@/procedures/list-repositories/utils/build-repository"
import {
  PULL_REQUESTS_PER_AUTHOR,
  toForgePullRequest,
  type ForgeSnapshot,
} from "@/procedures/list-repositories/utils/forge-pull-request"
import { isTrackedBranch, toLocalBranch, type LocalBranch } from "@/procedures/list-repositories/utils/local-branch"
import type { ForgeProblem } from "@/procedures/list-repositories/utils/repository"
import type { ForgeCredentialReader } from "@/utils/forge-credential-reader"
import { createRepositoryAdapterOpener, problemOf, type RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import type { GitAdapterInput, Resolved, Remote, GitAdapter } from "@flightplan/git-forge"

const FORGE_CACHE_MS = 120_000
const FETCH_INTERVAL_MS = 300_000

export interface InspectionRequest {
  readonly path: string
  readonly forges: ForgesChoice | null
  readonly trackedAuthorIds: readonly string[]
  readonly selfAuthorId: string | null
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
    | { readonly kind: "failed", readonly problem: ForgeProblem }

interface CachedOutcome {
  readonly fetchedAt: number
  readonly outcome: Promise<ForgeOutcome>
}

const failedInspection = (base: Pick<RepositoryInspection, "forge" | "forgeSlug">, problem: ForgeProblem): RepositoryInspection => ({
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
    if (!opened.resolved.ok) return failedInspection(base, opened.resolved.error.problem)
    return base.forge === "git"
      ? await this.inspectBranches(opened.resolved.gitAdapter, base, request)
      : await this.inspectForge(opened.resolved.gitAdapter, base, request, opened.forge)
  }

  private readonly inspectBranches = async (
    adapter: GitAdapter,
    base: Pick<RepositoryInspection, "forge" | "forgeSlug">,
    request: InspectionRequest,
  ): Promise<RepositoryInspection> => {
    this.fetchInBackgroundWhenDue(adapter, request.path)
    try {
      const trackedAuthorIds = request.selfAuthorId === null ? request.trackedAuthorIds : [...request.trackedAuthorIds, request.selfAuthorId]
      const tips = (await adapter.listBranches()).filter((tip) => isTrackedBranch(tip, trackedAuthorIds))
      const starts = await Promise.all(tips.map(async (tip) => await adapter.branchStart(tip.name)))
      const branches: LocalBranch[] = tips.map((tip, position) => toLocalBranch(tip, starts[position] ?? null))
      return { ...base, problem: null, snapshot: null, branches }
    } catch (error) {
      return failedInspection(base, problemOf(error))
    }
  }

  private readonly inspectForge = async (
    adapter: GitAdapter,
    base: Pick<RepositoryInspection, "forge" | "forgeSlug">,
    request: InspectionRequest,
    forge: SetupForge,
  ): Promise<RepositoryInspection> => {
    const outcome = await this.cachedForgeOutcome(adapter, request, forge)
    return outcome.kind === "failed"
      ? failedInspection(base, outcome.problem)
      : { ...base, problem: null, snapshot: outcome.snapshot, branches: [] }
  }

  private readonly cachedForgeOutcome = async (
    adapter: GitAdapter,
    request: InspectionRequest,
    forge: SetupForge,
  ): Promise<ForgeOutcome> => {
    const key = [request.path, forge, ...[...request.trackedAuthorIds].sort()].join("\n")
    const now = this.dependencies.now().getTime()
    const cached = this.cachedOutcomes.get(key)
    if (cached !== undefined && now - cached.fetchedAt < FORGE_CACHE_MS) return await cached.outcome
    const outcome = this.fetchForge(adapter, request)
    this.cachedOutcomes = new Map([...this.cachedOutcomes, [key, { fetchedAt: now, outcome }]])
    return await outcome
  }

  private readonly fetchForge = async (adapter: GitAdapter, request: InspectionRequest): Promise<ForgeOutcome> => {
    if (!adapter.supports("history")) return { kind: "failed", problem: "unsupported" }
    try {
      const viewer = await adapter.viewer()
      const histories = await adapter.listPullRequests({
        authors: [viewer.login, ...request.trackedAuthorIds],
        limit: PULL_REQUESTS_PER_AUTHOR,
      })
      return { kind: "fetched", snapshot: { viewerLogin: viewer.login, pullRequests: histories.map(toForgePullRequest) } }
    } catch (error) {
      return { kind: "failed", problem: problemOf(error) }
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
