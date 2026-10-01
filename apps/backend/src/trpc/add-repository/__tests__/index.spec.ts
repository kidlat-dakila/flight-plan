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

describe("repository.add procedure", () => {
  it("adds a repository and lists it afterwards", async () => {
    const caller = appRouter.createCaller(createContext([storefront]))

    await expect(caller.repository.add({ path: "/work/ledger-api" })).resolves.toStrictEqual({ name: "ledger-api" })
    await expect(caller.repository.list({ statuses: null, authors: null })).resolves.toMatchObject({
      repositories: [{ name: "storefront" }, { name: "ledger-api", source: [{ text: "Local git" }, { text: "/work/ledger-api", kind: "code" }] }],
    })
  })

  it("rejects a path it cannot add with a message for the user", async () => {
    const caller = appRouter.createCaller(createContext([storefront]))

    await expect(caller.repository.add({ path: "/work/storefront" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "/work/storefront is already on the list.",
    })
  })

  it("rejects input with unknown properties", async () => {
    const caller = appRouter.createCaller(createContext([]))
    const inputWithUnknownProperty = { path: "/work/ledger-api", name: "other" }

    await expect(caller.repository.add(inputWithUnknownProperty)).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
