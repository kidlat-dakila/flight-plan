import type { Repository } from "@/repository/repository"
import { InMemoryRepositoryStore } from "@/repository/repository-store"
import type { TrpcContext } from "@/trpc/context"
import { appRouter } from "@/trpc/router"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const storefront: Repository = {
  name: "storefront",
  path: "/work/storefront",
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  targets: [],
}

const createContext = (repositories: readonly Repository[]): TrpcContext => ({
  repositoryStore: new InMemoryRepositoryStore(repositories),
  now: () => NOW,
  dataNotice: null,
})

describe("repository.dismissNewTarget procedure", () => {
  it("dismisses the prompt for a new review target", async () => {
    const newBranch = { kind: "branch" as const, name: "first", branchStatus: "no-review" as const, isNew: true, updatedAt: NOW }
    const caller = appRouter.createCaller(createContext([{ ...storefront, targets: [newBranch] }]))

    await expect(
      caller.repository.dismissNewTarget({ repositoryName: "storefront", targetId: "branch-first" }),
    ).resolves.toStrictEqual({ targetId: "branch-first" })
    await expect(caller.repository.list({ statuses: null, authors: null })).resolves.toMatchObject({
      repositories: [{ newTargets: [], content: { kind: "targets" } }],
    })
  })

  it("reports a review target it cannot find", async () => {
    const caller = appRouter.createCaller(createContext([storefront]))

    await expect(
      caller.repository.dismissNewTarget({ repositoryName: "storefront", targetId: "pr-1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
