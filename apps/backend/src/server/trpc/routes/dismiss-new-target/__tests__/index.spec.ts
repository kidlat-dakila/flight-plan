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
  hasFollowedAuthors: true,
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

describe("repository.dismissNewTarget route", () => {
  it("delegates to the dismiss-new-target procedure", async () => {
    const newBranch = { kind: "branch" as const, name: "first", branchStatus: "no-review" as const, isNew: true, updatedAt: new Date("2026-10-01T12:00:00.000Z") }
    const caller = appRouter.createCaller(createContext([{ ...storefront, targets: [newBranch] }]))

    await expect(
      caller.repository.dismissNewTarget({ repositoryName: "storefront", targetId: "branch-first" }),
    ).resolves.toStrictEqual({ targetId: "branch-first" })
  })

  it("maps a review target it cannot find to a NOT_FOUND error", async () => {
    const caller = appRouter.createCaller(createContext([storefront]))

    await expect(
      caller.repository.dismissNewTarget({ repositoryName: "storefront", targetId: "pr-1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
