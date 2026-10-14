import { addRepository } from "@/procedures/add-repository"
import { createConversationEnvironment, type ProcedureContext, openSampleRepository } from "@/procedures/context"
import { readSampleInstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { InMemoryChangeReader } from "@/procedures/get-review/utils/change-reader"
import { InMemoryPullRequestForge } from "@/procedures/get-review/utils/pull-request-forge"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { DEV, GITHUB_FORGES, LENA, servedByForge } from "@/procedures/get-setup/utils/__tests__/setup-fixture"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { InMemoryImportFileStore } from "@/procedures/import-review/utils/import-file-store"
import { InMemoryConfigurationStore } from "@/procedures/list-configurations/utils/configuration-store"
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

const createContext = (repositories: readonly Repository[], setup: Setup = EMPTY_SETUP): ProcedureContext => ({
  repositoryStore: new InMemoryRepositoryStore(repositories),
  reviewStore: new InMemoryReviewStore([]),
  pullRequestForge: new InMemoryPullRequestForge([], () => new Date()),
  changeReader: new InMemoryChangeReader([]),
  pullBranch: skipBranchPull,
  openRepository: openSampleRepository,
  setupStore: new InMemorySetupStore(setup),
  configurationStore: new InMemoryConfigurationStore([]),
  setupEnvironment: { ...createMockSetupEnvironment(), isRepositoryFolder: async () => await Promise.resolve(true) },
  conversationEnvironment: createConversationEnvironment(),
  highlightCode: highlightAsPlainText,
  readInstructionTexts: readSampleInstructionTexts,
  writePublishedPage: writeSamplePublishedPage,
  importFiles: new InMemoryImportFileStore(),
  now: () => NOW,
  dataNotice: null,
  appUrl: "http://localhost:4200",
})

const SELF_ONLY = { selfAuthorId: DEV.id, trackedAuthorIds: [] }

describe("addRepository", () => {
  it("accepts a new path and adds it to the store with its authors followed", async () => {
    const context = createContext([storefront])

    await expect(
      addRepository({ path: "/work/ledger-api", selfAuthorId: DEV.id, trackedAuthorIds: [LENA.id] }, context),
    ).resolves.toStrictEqual({
      kind: "accepted",
      repository: { name: "ledger-api", path: "/work/ledger-api", forge: "git", forgeSlug: null, problem: null, hasFollowedAuthors: false, targets: [] },
    })
    await expect(context.repositoryStore.list()).resolves.toMatchObject([
      { name: "storefront" },
      { name: "ledger-api", hasFollowedAuthors: true },
    ])
  })

  it("rejects a local git repository without the user chosen, and leaves the store alone", async () => {
    const context = createContext([storefront])

    await expect(
      addRepository({ path: "/work/ledger-api", selfAuthorId: null, trackedAuthorIds: [LENA.id] }, context),
    ).resolves.toStrictEqual({ kind: "rejected", message: "Pick which user you are in ledger-api." })
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([storefront])
  })

  it("rejects a forge repository with nobody tracked, even when a user is sent along", async () => {
    const context = createContext([storefront], { ...EMPTY_SETUP, forges: GITHUB_FORGES })

    await expect(addRepository({ path: "/work/ledger-api", ...SELF_ONLY }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Track at least one user in ledger-api.",
    })
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([storefront])
  })

  it("asks for a tracked user, not the user, when a forge serves the repository while the default forge is local git", async () => {
    const context = servedByForge(createContext([storefront]), "gh")

    await expect(addRepository({ path: "/work/ledger-api", ...SELF_ONLY }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "Track at least one user in ledger-api.",
    })
    await expect(
      addRepository({ path: "/work/ledger-api", selfAuthorId: null, trackedAuthorIds: ["@teo"] }, context),
    ).resolves.toMatchObject({ kind: "accepted" })
  })

  it("asks for the user when local git serves the repository while the default forge is a forge", async () => {
    const context = servedByForge(createContext([storefront], { ...EMPTY_SETUP, forges: GITHUB_FORGES }), "git")

    await expect(
      addRepository({ path: "/work/ledger-api", selfAuthorId: null, trackedAuthorIds: [LENA.id] }, context),
    ).resolves.toStrictEqual({ kind: "rejected", message: "Pick which user you are in ledger-api." })
  })

  it("accepts a forge repository with a tracked author", async () => {
    const context = createContext([storefront], { ...EMPTY_SETUP, forges: GITHUB_FORGES })

    await expect(
      addRepository({ path: "/work/ledger-api", selfAuthorId: null, trackedAuthorIds: ["@teo"] }, context),
    ).resolves.toMatchObject({ kind: "accepted" })
  })

  it("rejects an author the repository does not have", async () => {
    const context = createContext([storefront])

    await expect(
      addRepository({ path: "/work/ledger-api", selfAuthorId: DEV.id, trackedAuthorIds: ["ghost@acme.example"] }, context),
    ).resolves.toStrictEqual({ kind: "rejected", message: "ghost@acme.example is not an author of this repository." })
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([storefront])
  })

  it("rejects a folder that is not a git repository without changing the store", async () => {
    const context = {
      ...createContext([storefront]),
      setupEnvironment: { ...createMockSetupEnvironment(), isRepositoryFolder: async () => await Promise.resolve(false) },
    }

    await expect(addRepository({ path: "/work/notes", ...SELF_ONLY }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "/work/notes is not a git repository.",
    })
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([storefront])
  })

  it("rejects a path already on the list without changing the store", async () => {
    const context = createContext([storefront])

    await expect(addRepository({ path: "/work/storefront", ...SELF_ONLY }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "/work/storefront is already on the list.",
    })
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([storefront])
  })
})
