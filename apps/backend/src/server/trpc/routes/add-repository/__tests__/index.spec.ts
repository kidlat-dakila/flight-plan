import type { ProcedureContext } from "@/procedures/context"
import { highlightAsPlainText } from "@/procedures/get-review/utils/code/highlighter"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { InMemoryRepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { appRouter } from "@/server/trpc/router"

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
  now: () => new Date("2026-10-01T12:00:00.000Z"),
  dataNotice: null,
})

describe("repository.add route", () => {
  it("delegates to the add-repository procedure", async () => {
    const caller = appRouter.createCaller(createContext([storefront]))

    await expect(caller.repository.add({ path: "/work/ledger-api" })).resolves.toStrictEqual({ name: "ledger-api" })
  })

  it("maps a rejected addition to a BAD_REQUEST error", async () => {
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
