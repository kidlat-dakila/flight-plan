import { createConversationEnvironment, type ProcedureContext, openSampleRepository } from "@/procedures/context"
import { readSampleInstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { InMemoryChangeReader } from "@/procedures/get-review/utils/change-reader"
import { InMemoryPullRequestForge } from "@/procedures/get-review/utils/pull-request-forge"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { InMemoryImportFileStore } from "@/procedures/import-review/utils/import-file-store"
import { InMemoryConfigurationStore } from "@/procedures/list-configurations/utils/configuration-store"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { InMemoryRepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { writeSamplePublishedPage } from "@/procedures/publish-artifact/utils/published-page-writer"
import { skipBranchPull } from "@/procedures/rebuild-review/utils/branch-puller"
import { appRouter } from "@/server/trpc/router"
import { highlightAsPlainText } from "@flightplan/codegraph"

const storefront: Repository = {
  name: "storefront",
  path: "/work/storefront",
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  targets: [],
}

const SELF_ONLY = { selfAuthorId: "dev@acme.example", trackedAuthorIds: [] }

const createContext = (repositories: readonly Repository[]): ProcedureContext => ({
  repositoryStore: new InMemoryRepositoryStore(repositories),
  reviewStore: new InMemoryReviewStore([]),
  pullRequestForge: new InMemoryPullRequestForge([], () => new Date()),
  changeReader: new InMemoryChangeReader([]),
  pullBranch: skipBranchPull,
  openRepository: openSampleRepository,
  setupStore: new InMemorySetupStore(EMPTY_SETUP),
  configurationStore: new InMemoryConfigurationStore([]),
  setupEnvironment: { ...createMockSetupEnvironment(), isRepositoryFolder: async () => await Promise.resolve(true) },
  conversationEnvironment: createConversationEnvironment(),
  highlightCode: highlightAsPlainText,
  readInstructionTexts: readSampleInstructionTexts,
  writePublishedPage: writeSamplePublishedPage,
  importFiles: new InMemoryImportFileStore(),
  now: () => new Date("2026-10-01T12:00:00.000Z"),
  dataNotice: null,
  appUrl: "http://localhost:4200",
})

describe("repository.add route", () => {
  it("delegates to the add-repository procedure", async () => {
    const caller = appRouter.createCaller(createContext([storefront]))

    await expect(caller.repository.add({ path: "/work/ledger-api", ...SELF_ONLY })).resolves.toStrictEqual({ name: "ledger-api" })
  })

  it("maps a rejected addition to a BAD_REQUEST error", async () => {
    const caller = appRouter.createCaller(createContext([storefront]))

    await expect(caller.repository.add({ path: "/work/storefront", ...SELF_ONLY })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "/work/storefront is already on the list.",
    })
  })

  it("rejects input with unknown properties", async () => {
    const caller = appRouter.createCaller(createContext([]))
    const inputWithUnknownProperty = { path: "/work/ledger-api", ...SELF_ONLY, name: "other" }

    await expect(caller.repository.add(inputWithUnknownProperty)).rejects.toMatchObject({ code: "BAD_REQUEST" })
  })
})
