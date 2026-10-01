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

describe("repository.list procedure", () => {
  it("lists the repositories of the store", async () => {
    const caller = appRouter.createCaller(createContext([storefront]))

    await expect(caller.repository.list({ statuses: null, authors: null })).resolves.toMatchObject({
      kind: "repositories",
      summaryLabel: "1 repository • 0 review targets",
      repositories: [{ name: "storefront" }],
    })
  })

  it("reports an empty index for an empty store", async () => {
    const caller = appRouter.createCaller(createContext([]))

    await expect(caller.repository.list({ statuses: null, authors: null })).resolves.toStrictEqual({ kind: "empty", notice: null })
  })
})
