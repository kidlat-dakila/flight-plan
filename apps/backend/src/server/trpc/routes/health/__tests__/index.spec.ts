import { createConversationEnvironment, type ProcedureContext } from "@/procedures/context"
import { InMemoryChangeReader } from "@/procedures/get-review/utils/change-reader"
import { highlightAsPlainText } from "@/procedures/get-review/utils/code/highlighter"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { InMemoryRepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { appRouter } from "@/server/trpc/router"

const context: ProcedureContext = {
  repositoryStore: new InMemoryRepositoryStore([]),
  reviewStore: new InMemoryReviewStore([]),
  changeReader: new InMemoryChangeReader([]),
  setupStore: new InMemorySetupStore(EMPTY_SETUP),
  setupEnvironment: createMockSetupEnvironment(),
  conversationEnvironment: createConversationEnvironment(),
  highlightCode: highlightAsPlainText,
  now: () => new Date("2026-10-01T12:00:00.000Z"),
  dataNotice: null,
}

describe("health route", () => {
  it("delegates to the health procedure", async () => {
    await expect(appRouter.createCaller(context).health()).resolves.toStrictEqual({ status: "ok" })
  })
})
