import { createConversationEnvironment, createMockErrorLog, type ProcedureContext, openSampleRepository } from "@/procedures/context"
import { readSampleInstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { skipBranchPull } from "@/procedures/get-review/utils/branch-puller"
import { InMemoryChangeReader } from "@/procedures/get-review/utils/change-reader"
import { InMemoryPullRequestForge } from "@/procedures/get-review/utils/pull-request-forge"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { InMemoryImportFileStore } from "@/procedures/import-review/utils/import-file-store"
import { InMemoryConfigurationStore } from "@/procedures/list-configurations/utils/configuration-store"
import { InMemoryRepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { writeSamplePublishedPage } from "@/procedures/publish-artifact/utils/published-page-writer"
import { appRouter } from "@/server/trpc/router"
import { highlightAsPlainText } from "@flightplan/codegraph"

const context: ProcedureContext = {
  repositoryStore: new InMemoryRepositoryStore([]),
  reviewStore: new InMemoryReviewStore([]),
  pullRequestForge: new InMemoryPullRequestForge([], () => new Date()),
  changeReader: new InMemoryChangeReader([]),
  pullBranch: skipBranchPull,
  openRepository: openSampleRepository,
  setupStore: new InMemorySetupStore(EMPTY_SETUP),
  configurationStore: new InMemoryConfigurationStore([]),
  setupEnvironment: createMockSetupEnvironment(),
  conversationEnvironment: createConversationEnvironment(),
  highlightCode: highlightAsPlainText,
  readInstructionTexts: readSampleInstructionTexts,
  writePublishedPage: writeSamplePublishedPage,
  importFiles: new InMemoryImportFileStore(),
  openTerminal: null,
  closeTerminal: null,
  now: () => new Date("2026-10-01T12:00:00.000Z"),
  dataNotice: null,
  runningVersion: null,
  appUrl: "http://localhost:4200",
  errorLog: createMockErrorLog(),
}

describe("health route", () => {
  it("delegates to the health procedure", async () => {
    await expect(appRouter.createCaller(context).health()).resolves.toStrictEqual({ status: "ok" })
  })
})
