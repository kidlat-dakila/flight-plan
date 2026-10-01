import { addRepository } from "@/procedures/add-repository"
import type { ProcedureContext } from "@/procedures/context"
import { highlightAsPlainText } from "@/procedures/get-review/utils/code/highlighter"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { InMemoryRepositoryStore } from "@/procedures/list-repositories/utils/repository-store"

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
  reviewStore: new InMemoryReviewStore([]),
  setupStore: new InMemorySetupStore(EMPTY_SETUP),
  setupEnvironment: createMockSetupEnvironment(),
  highlightCode: highlightAsPlainText,
  now: () => NOW,
  dataNotice: null,
})

describe("addRepository", () => {
  it("accepts a new path and adds it to the store", async () => {
    const context = createContext([storefront])

    await expect(addRepository({ path: "/work/ledger-api" }, context)).resolves.toStrictEqual({
      kind: "accepted",
      repository: { name: "ledger-api", path: "/work/ledger-api", forge: "git", forgeSlug: null, problem: null, targets: [] },
    })
    await expect(context.repositoryStore.list()).resolves.toMatchObject([{ name: "storefront" }, { name: "ledger-api" }])
  })

  it("rejects a path already on the list without changing the store", async () => {
    const context = createContext([storefront])

    await expect(addRepository({ path: "/work/storefront" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "/work/storefront is already on the list.",
    })
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([storefront])
  })
})
