import { type Setup, type SetupRepository, EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import type { RepositoryInspection } from "@/procedures/list-repositories/utils/build-repository"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import {
  startTargetMemory,
  withAddedTarget,
  withDismissedTarget,
  type AddedTarget,
  type TargetMemory,
} from "@/procedures/list-repositories/utils/target-memory"
import { LiveRepositoryStore } from "@/utils/live-repository-store"
import type { InspectionRequest } from "@/utils/repository-inspector"
import type { TargetMemoryStore } from "@/utils/target-memory-file-store"

const BASELINE = new Date("2026-10-01T10:00:00.000Z")
const AFTER_BASELINE = new Date("2026-10-01T11:00:00.000Z")

const registered = (name: string, overrides: Partial<SetupRepository> = {}): SetupRepository => ({
  name,
  path: `/work/${name}`,
  selfAuthor: { id: "dev@acme.test", name: "Dev", detail: "dev@acme.test", avatarUrl: null },
  trackedAuthors: [{ id: "mira@acme.test", name: "Mira", detail: "mira@acme.test", avatarUrl: null }],
  ...overrides,
})

const setupWith = (...repositories: readonly SetupRepository[]): Setup => ({ ...EMPTY_SETUP, repositories })

const branchInspection: RepositoryInspection = {
  forge: "git",
  forgeSlug: null,
  problem: null,
  snapshot: null,
  branches: [{ name: "first", tipDate: AFTER_BASELINE, startedAt: AFTER_BASELINE }],
}

class MemoryTargetMemoryStore implements TargetMemoryStore {
  private memories: ReadonlyMap<string, TargetMemory> = new Map()

  public readonly ensure = async (repositoryName: string): Promise<TargetMemory> => {
    const memory = this.memories.get(repositoryName) ?? startTargetMemory(BASELINE)
    this.memories = new Map([...this.memories, [repositoryName, memory]])
    return await Promise.resolve(memory)
  }

  public readonly dismiss = async (repositoryName: string, targetId: string): Promise<void> => {
    this.memories = new Map([...this.memories, [repositoryName, withDismissedTarget(await this.ensure(repositoryName), targetId)]])
  }

  public readonly add = async (repositoryName: string, target: AddedTarget): Promise<void> => {
    this.memories = new Map([...this.memories, [repositoryName, withAddedTarget(await this.ensure(repositoryName), target)]])
  }
}

interface StoreHarness {
  readonly store: LiveRepositoryStore
  readonly setupStore: InMemorySetupStore
  readonly requests: () => InspectionRequest[]
  readonly forgottenPaths: () => string[]
}

const createStore = (setup: Setup, inspection: RepositoryInspection = branchInspection): StoreHarness => {
  const setupStore = new InMemorySetupStore(setup)
  const inspect = vi.fn<(request: InspectionRequest) => Promise<RepositoryInspection>>(async () => await Promise.resolve(inspection))
  const forget = vi.fn<(path: string) => void>()
  const store = new LiveRepositoryStore({
    setupStore,
    inspector: { inspect, forget },
    targetMemory: new MemoryTargetMemoryStore(),
    now: () => AFTER_BASELINE,
  })
  return {
    store,
    setupStore,
    requests: () => inspect.mock.calls.map(([request]) => request),
    forgottenPaths: () => forget.mock.calls.map(([path]) => path),
  }
}

describe("LiveRepositoryStore", () => {
  it("lists the repositories of the setup with what the inspection found", async () => {
    const { store } = createStore(setupWith(registered("storefront")))

    await expect(store.list()).resolves.toStrictEqual([
      {
        name: "storefront",
        path: "/work/storefront",
        forge: "git",
        forgeSlug: null,
        problem: null,
        targets: [{ kind: "branch", name: "first", branchStatus: "no-review", isNew: true, updatedAt: AFTER_BASELINE }],
      },
    ])
  })

  it("inspects each repository with its path, its forges and its tracked and own authors", async () => {
    const { store, requests } = createStore(setupWith(registered("storefront")))

    await store.list()

    expect(requests()).toStrictEqual([
      {
        path: "/work/storefront",
        forges: null,
        trackedAuthorIds: ["mira@acme.test"],
        selfAuthorId: "dev@acme.test",
        addedBranchNames: [],
        addedPullRequestAuthors: [],
      },
    ])
  })

  it("adds a review target to a repository, forgets what was read of it and inspects it with the target", async () => {
    const { store, requests, forgottenPaths } = createStore(setupWith(registered("storefront")))
    const pullRequest = {
      kind: "pull-request" as const,
      number: 12,
      title: "Retry webhooks",
      branch: "fix/webhook-retry",
      author: "jonas",
      authorAvatarUrl: null,
      branchStatus: "no-review" as const,
      isNew: false,
      updatedAt: AFTER_BASELINE,
    }

    await store.addTarget("storefront", { kind: "branch", name: "spike/returns", branchStatus: "no-review", isNew: false, updatedAt: AFTER_BASELINE })
    await expect(store.addTarget("storefront", pullRequest)).resolves.toMatchObject({ name: "storefront" })

    expect(forgottenPaths()).toStrictEqual(["/work/storefront", "/work/storefront"])
    expect(requests().at(-1)).toMatchObject({ addedBranchNames: ["spike/returns"], addedPullRequestAuthors: ["jonas"] })
  })

  it("adds no review target to a repository it does not hold", async () => {
    const { store, forgottenPaths } = createStore(setupWith(registered("storefront")))

    await expect(
      store.addTarget("gone", { kind: "branch", name: "first", branchStatus: "no-review", isNew: false, updatedAt: AFTER_BASELINE }),
    ).resolves.toBeNull()
    expect(forgottenPaths()).toStrictEqual([])
  })

  it("forgets what was read of a repository when asked to refresh it, and nothing for one it does not hold", async () => {
    const { store, forgottenPaths } = createStore(setupWith(registered("storefront")))

    await store.refresh("storefront")
    await store.refresh("gone")

    expect(forgottenPaths()).toStrictEqual(["/work/storefront"])
  })

  it("has no sample data notice", () => {
    expect(createStore(EMPTY_SETUP).store.notice).toBeNull()
  })

  it("lists the registered repositories without inspecting them", async () => {
    const { store, requests } = createStore(setupWith(registered("storefront"), registered("ledger")))

    await expect(store.listRegistered()).resolves.toStrictEqual([
      { name: "storefront", path: "/work/storefront" },
      { name: "ledger", path: "/work/ledger" },
    ])
    expect(requests()).toStrictEqual([])
  })

  it("registers a new repository in the setup with the authors chosen for it", async () => {
    const { store, setupStore } = createStore(setupWith(registered("storefront")))
    const added: Repository = { name: "ledger", path: "/work/ledger", forge: "git", forgeSlug: null, problem: null, targets: [] }
    const selfAuthor = { id: "dev@acme.test", name: "Dev", detail: "dev@acme.test", avatarUrl: null }
    const trackedAuthors = [{ id: "mira@acme.test", name: "Mira", detail: "mira@acme.test", avatarUrl: null }]

    await store.add(added, { selfAuthor, trackedAuthors })

    await expect(setupStore.read()).resolves.toMatchObject({
      repositories: [{ name: "storefront" }, { name: "ledger", path: "/work/ledger", selfAuthor, trackedAuthors }],
    })
  })

  it("does not register a repository twice", async () => {
    const { store, setupStore } = createStore(setupWith(registered("storefront")))

    await store.add(
      { name: "storefront", path: "/work/storefront", forge: "git", forgeSlug: null, problem: null, targets: [] },
      { selfAuthor: null, trackedAuthors: [] },
    )

    await expect(setupStore.read()).resolves.toMatchObject({ repositories: [{ name: "storefront" }] })
  })

  it("clears the new mark of a dismissed target for good", async () => {
    const { store } = createStore(setupWith(registered("storefront")))

    await expect(store.dismissNewTarget("storefront", "branch-first")).resolves.toMatchObject({ targets: [{ isNew: false }] })
    await expect(store.list()).resolves.toMatchObject([{ targets: [{ isNew: false }] }])
  })

  it("reports null for a target or a repository it cannot find", async () => {
    const { store } = createStore(setupWith(registered("storefront")))

    await expect(store.dismissNewTarget("storefront", "pr-1")).resolves.toBeNull()
    await expect(store.dismissNewTarget("ledger", "branch-first")).resolves.toBeNull()
  })

  it("reads the authors saved for a repository, and nothing for one it does not hold", async () => {
    const { store } = createStore(setupWith(registered("storefront")))

    await expect(store.readAuthors("storefront")).resolves.toStrictEqual({
      selfAuthor: { id: "dev@acme.test", name: "Dev", detail: "dev@acme.test", avatarUrl: null },
      trackedAuthors: [{ id: "mira@acme.test", name: "Mira", detail: "mira@acme.test", avatarUrl: null }],
    })
    await expect(store.readAuthors("ledger")).resolves.toBeNull()
  })

  it("replaces the authors of one repository in the setup and reports a repository it does not hold", async () => {
    const { store, setupStore } = createStore(setupWith(registered("storefront"), registered("ledger")))

    await expect(store.replaceAuthors("storefront", { selfAuthor: null, trackedAuthors: [] })).resolves.toBe(true)
    await expect(store.replaceAuthors("missing", { selfAuthor: null, trackedAuthors: [] })).resolves.toBe(false)

    await expect(setupStore.read()).resolves.toMatchObject({
      repositories: [{ name: "storefront", selfAuthor: null, trackedAuthors: [] }, { name: "ledger", selfAuthor: { id: "dev@acme.test" } }],
    })
  })

  it("removes a repository from the setup and reports one it does not hold", async () => {
    const { store, setupStore } = createStore(setupWith(registered("storefront"), registered("ledger")))

    await expect(store.remove("storefront")).resolves.toBe(true)
    await expect(store.remove("storefront")).resolves.toBe(false)

    await expect(setupStore.read()).resolves.toMatchObject({ repositories: [{ name: "ledger" }] })
  })

  it("reads who the viewer is from the forge, and has nobody for local git or an unknown repository", async () => {
    const forgeInspection: RepositoryInspection = {
      forge: "gh",
      forgeSlug: "acme/storefront",
      problem: null,
      snapshot: { viewerLogin: "lena", pullRequests: [] },
      branches: [],
    }
    const { store: forgeStore } = createStore(setupWith(registered("storefront")), forgeInspection)
    const { store: gitStore } = createStore(setupWith(registered("storefront")))

    await expect(forgeStore.readViewerLogin("storefront")).resolves.toBe("lena")
    await expect(gitStore.readViewerLogin("storefront")).resolves.toBeNull()
    await expect(forgeStore.readViewerLogin("gone")).resolves.toBeNull()
  })
})
