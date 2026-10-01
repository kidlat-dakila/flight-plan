import type { ProcedureContext } from "@/procedures/context"
import { listRepositories } from "@/procedures/list-repositories"
import type { Repository } from "@/repository/repository"
import { InMemoryRepositoryStore } from "@/repository/repository-store"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const storefront: Repository = {
  name: "storefront",
  path: "/work/storefront",
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  targets: [],
}

const createContext = (repositories: readonly Repository[]): ProcedureContext => ({
  repositoryStore: new InMemoryRepositoryStore(repositories),
  now: () => NOW,
  dataNotice: null,
})

describe("listRepositories", () => {
  it("lists the repositories of the store", async () => {
    await expect(listRepositories({ statuses: null, authors: null }, createContext([storefront]))).resolves.toMatchObject({
      kind: "repositories",
      summaryLabel: "1 repository • 0 review targets",
      repositories: [{ name: "storefront" }],
    })
  })

  it("reports an empty index for an empty store", async () => {
    await expect(listRepositories({ statuses: null, authors: null }, createContext([]))).resolves.toStrictEqual({ kind: "empty", notice: null })
  })
})
