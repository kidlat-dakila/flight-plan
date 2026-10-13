import { createConversationEnvironment, type ProcedureContext, openSampleRepository } from "@/procedures/context"
import { readSampleInstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { InMemoryChangeReader, type RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { WEBHOOK_RETRY_ARTIFACT } from "@/procedures/get-review/utils/mocks/webhook-retry-artifact"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import type { ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { createInMemoryFixtureCatalog, fixtureCaseOf } from "@/procedures/list-fixtures/utils/fixture-catalog"
import { listRepositories } from "@/procedures/list-repositories"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { InMemoryRepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { writeSamplePublishedPage } from "@/procedures/publish-artifact/utils/published-page-writer"
import { skipBranchPull } from "@/procedures/rebuild-review/utils/branch-puller"
import { highlightAsPlainText } from "@flightplan/codegraph"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const storefront: Repository = {
  name: "storefront",
  path: "/work/storefront",
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  hasFollowedAuthors: true,
  targets: [],
}

const reactSpa: Repository = { ...storefront, name: "react-spa", path: "/fixtures/react-spa", forge: "git", forgeSlug: null }

const typescript: Repository = { ...reactSpa, name: "typescript", path: "/fixtures/typescript" }

const createContext = (repositories: readonly Repository[]): ProcedureContext => ({
  repositoryStore: new InMemoryRepositoryStore(repositories),
  reviewStore: new InMemoryReviewStore([]),
  changeReader: new InMemoryChangeReader([]),
  pullBranch: skipBranchPull,
  openRepository: openSampleRepository,
  setupStore: new InMemorySetupStore(EMPTY_SETUP),
  setupEnvironment: createMockSetupEnvironment(),
  conversationEnvironment: createConversationEnvironment(),
  highlightCode: highlightAsPlainText,
  readInstructionTexts: readSampleInstructionTexts,
  writePublishedPage: writeSamplePublishedPage,
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
    await expect(listRepositories({ statuses: null, authors: null }, createContext([]))).resolves.toStrictEqual({
      kind: "empty",
      notice: null,
      fixtures: null,
    })
  })

  it("lists the requested fixture case beside the repositories when the context has a fixture catalog", async () => {
    const context = { ...createContext([storefront]), fixtureCatalog: createInMemoryFixtureCatalog([reactSpa, typescript].map(fixtureCaseOf)) }

    await expect(listRepositories({ statuses: null, authors: null, fixtureCase: "typescript" }, context)).resolves.toMatchObject({
      repositories: [{ name: "storefront" }],
      fixtures: { caseSelect: { value: "typescript" }, repository: { name: "typescript", countLabel: "0 review targets" } },
    })
  })

  it("lists the first fixture case when none is requested", async () => {
    const context = { ...createContext([]), fixtureCatalog: createInMemoryFixtureCatalog([reactSpa, typescript].map(fixtureCaseOf)) }

    await expect(listRepositories({ statuses: null, authors: null }, context)).resolves.toMatchObject({
      kind: "empty",
      fixtures: { caseSelect: { value: "react-spa" } },
    })
  })

  it("lists a branch that has a Flight Plan and is still in the checkout, though the repository does not list it", async () => {
    const spikeChange: RecordedChange = {
      repositoryPath: "/work/storefront",
      branchName: "spike/returns",
      revision: { headCommit: "1111111", baseCommit: "0000000" },
      diff: "",
      changedPaths: [],
      texts: {},
    }
    const scaffold: ReviewScaffold = {
      artifact: WEBHOOK_RETRY_ARTIFACT,
      baseCommit: "0000000",
      request: {
        preset: "standard",
        order: "risk-first",
        customOrder: null,
        writer: { kind: "author", start: "scaffold" },
        requestedAt: new Date("2026-10-01T10:00:00.000Z"),
      },
    }
    const context = { ...createContext([storefront]), changeReader: new InMemoryChangeReader([spikeChange]) }
    await context.reviewStore.writeScaffold({ repositoryName: "storefront", targetId: "branch-spike/returns" }, scaffold)
    await context.reviewStore.writeScaffold({ repositoryName: "storefront", targetId: "branch-spike/deleted" }, scaffold)

    await expect(listRepositories({ statuses: null, authors: null }, context)).resolves.toMatchObject({
      repositories: [
        {
          name: "storefront",
          countLabel: "1 review target",
          content: {
            kind: "targets",
            targets: [
              {
                id: "branch-spike/returns",
                title: { text: "spike/returns", kind: "code" },
                href: "/pr-reviews/storefront/branch-spike%2Freturns",
                updatedLabel: "2 hours ago",
              },
            ],
          },
        },
      ],
    })
  })
})
