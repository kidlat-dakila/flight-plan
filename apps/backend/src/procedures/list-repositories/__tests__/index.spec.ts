import { createConversationEnvironment, type ProcedureContext, openSampleRepository } from "@/procedures/context"
import { readSampleInstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { skipBranchPull } from "@/procedures/get-review/utils/branch-puller"
import { InMemoryChangeReader, type RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { WEBHOOK_RETRY_ARTIFACT } from "@/procedures/get-review/utils/mocks/webhook-retry-artifact"
import { InMemoryPullRequestForge } from "@/procedures/get-review/utils/pull-request-forge"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import type { ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { InMemoryImportFileStore } from "@/procedures/import-review/utils/import-file-store"
import { InMemoryConfigurationStore } from "@/procedures/list-configurations/utils/configuration-store"
import { createInMemoryFixtureCatalog, fixtureCaseOf } from "@/procedures/list-fixtures/utils/fixture-catalog"
import { listRepositories } from "@/procedures/list-repositories"
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

const reactSpa: Repository = { ...storefront, name: "react-spa", path: "/fixtures/react-spa", forge: "git", forgeSlug: null }

const typescript: Repository = { ...reactSpa, name: "typescript", path: "/fixtures/typescript" }

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
  closeTerminal: null,
  now: () => NOW,
  dataNotice: null,
  appUrl: "http://localhost:4200",
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
        configurationId: "standard",
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

  it("stops prompting for a new review target once its Flight Plan is complete and uploaded", async () => {
    const withNewTarget: Repository = {
      ...storefront,
      targets: [{ kind: "branch", name: "feature/web", branchStatus: "no-review", isNew: true, updatedAt: NOW }],
    }
    const key = { repositoryName: "storefront", targetId: "branch-feature/web" }
    const context = createContext([withNewTarget])
    const promptedIds = async (): Promise<readonly string[]> => {
      const index = await listRepositories({ statuses: null, authors: null }, context)
      return index.kind === "repositories" ? index.repositories.flatMap((line) => line.newTargets.map((prompt) => prompt.id)) : []
    }
    await context.reviewStore.writeScaffold(key, {
      artifact: { ...WEBHOOK_RETRY_ARTIFACT, status: "complete" },
      baseCommit: "0000000",
      request: { configurationId: "standard", preset: "standard", order: "risk-first", customOrder: null, writer: { kind: "none" }, requestedAt: NOW },
    })

    await expect(promptedIds()).resolves.toStrictEqual(["branch-feature/web"])

    await context.reviewStore.writePublications(key, [{ kind: "claude", url: "https://claude.ai/artifact/abc", publishedAt: NOW }])

    await expect(promptedIds()).resolves.toStrictEqual([])
  })
})
