import { createConversationEnvironment, type ProcedureContext, openSampleRepository } from "@/procedures/context"
import { dismissNewTarget } from "@/procedures/dismiss-new-target"
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
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { InMemoryRepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { writeSamplePublishedPage } from "@/procedures/publish-artifact/utils/published-page-writer"
import { highlightAsPlainText } from "@flightplan/codegraph"

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
  now: () => NOW,
  dataNotice: null,
  appUrl: "http://localhost:4200",
})

describe("dismissNewTarget", () => {
  it("clears the new mark and persists the change", async () => {
    const newBranch = { kind: "branch" as const, name: "first", branchStatus: "no-review" as const, isNew: true, updatedAt: NOW }
    const context = createContext([{ ...storefront, targets: [newBranch] }])

    await expect(dismissNewTarget({ repositoryName: "storefront", targetId: "branch-first" }, context)).resolves.toMatchObject({
      targets: [{ isNew: false }],
    })
    await expect(context.repositoryStore.list()).resolves.toMatchObject([{ targets: [{ isNew: false }] }])
  })

  it("reports null for a review target it cannot find", async () => {
    const context = createContext([storefront])

    await expect(dismissNewTarget({ repositoryName: "storefront", targetId: "pr-1" }, context)).resolves.toBeNull()
  })
})
