import { addRepository } from "@/procedures/add-repository"
import { createConversationEnvironment, createMockErrorLog, type ProcedureContext, openSampleRepository } from "@/procedures/context"
import { readSampleInstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { skipBranchPull } from "@/procedures/get-review/utils/branch-puller"
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
import { highlightAsPlainText } from "@flightplan/codegraph"

const NOW = new Date("2026-10-01T12:00:00.000Z")

const storefront: Repository = {
  name: "storefront",
  path: "/work/storefront",
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  targets: [],
  baseBranch: null,
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
  openTerminal: null,
  closeTerminal: null,
  now: () => NOW,
  dataNotice: null,
  runningVersion: null,
  appUrl: "http://localhost:4200",
  errorLog: createMockErrorLog(),
})

const NOBODY_TRACKED = { trackedAuthorIds: [], baseBranch: null }

describe("addRepository", () => {
  it("accepts a new path and adds it to the store with its authors followed", async () => {
    const context = createContext([storefront])

    await expect(
      addRepository({ path: "/work/ledger-api", trackedAuthorIds: [LENA.id], baseBranch: null }, context),
    ).resolves.toStrictEqual({
      kind: "accepted",
      repository: { name: "ledger-api", path: "/work/ledger-api", forge: "git", forgeSlug: null, problem: null, targets: [], baseBranch: null },
    })
    await expect(context.repositoryStore.list()).resolves.toMatchObject([
      { name: "storefront" },
      { name: "ledger-api" },
    ])
  })

  it("accepts a local git repository with nobody tracked", async () => {
    const context = createContext([storefront])

    await expect(addRepository({ path: "/work/ledger-api", ...NOBODY_TRACKED }, context)).resolves.toMatchObject({ kind: "accepted" })
  })

  it("leaves the git config user out of the tracked authors", async () => {
    const base = createContext([storefront])
    const identity = { name: "Lena Okafor", email: LENA.id }
    const context = {
      ...base,
      setupEnvironment: { ...base.setupEnvironment, readGitIdentity: async () => await Promise.resolve(identity) },
    }

    await expect(
      addRepository({ path: "/work/ledger-api", trackedAuthorIds: [LENA.id, DEV.id], baseBranch: null }, context),
    ).resolves.toMatchObject({ kind: "accepted" })
    await expect(context.repositoryStore.readAuthors("ledger-api")).resolves.toStrictEqual({
      selfAuthor: null,
      trackedAuthors: [DEV],
    })
  })

  it("accepts a forge repository with nobody tracked, so that Flight Plan follows everyone in it", async () => {
    const context = createContext([storefront], { ...EMPTY_SETUP, forges: GITHUB_FORGES })

    await expect(addRepository({ path: "/work/ledger-api", ...NOBODY_TRACKED }, context)).resolves.toMatchObject({ kind: "accepted" })
    await expect(context.repositoryStore.readAuthors("ledger-api")).resolves.toStrictEqual({ selfAuthor: null, trackedAuthors: [] })
  })

  it("accepts a repository local git serves while the default forge is a forge, with nobody picked", async () => {
    const context = servedByForge(createContext([storefront], { ...EMPTY_SETUP, forges: GITHUB_FORGES }), "git")

    await expect(addRepository({ path: "/work/ledger-api", ...NOBODY_TRACKED }, context)).resolves.toMatchObject({ kind: "accepted" })
  })

  it("accepts a forge repository with a tracked author", async () => {
    const context = createContext([storefront], { ...EMPTY_SETUP, forges: GITHUB_FORGES })

    await expect(
      addRepository({ path: "/work/ledger-api", trackedAuthorIds: ["@teo"], baseBranch: null }, context),
    ).resolves.toMatchObject({ kind: "accepted" })
  })

  it("saves the base branch chosen for the repository", async () => {
    const base = createContext([storefront])
    const context = {
      ...base,
      setupEnvironment: {
        ...base.setupEnvironment,
        listBranches: async () => await Promise.resolve([{ name: "develop", committedAt: NOW }]),
      },
    }

    await expect(addRepository({ path: "/work/ledger-api", ...NOBODY_TRACKED, baseBranch: "develop" }, context)).resolves.toMatchObject({
      kind: "accepted",
      repository: { baseBranch: "develop" },
    })
    await expect(context.repositoryStore.listRegistered()).resolves.toContainEqual({ name: "ledger-api", path: "/work/ledger-api", baseBranch: "develop" })
  })

  it("saves the detected main branch when no base branch is chosen", async () => {
    const base = createContext([storefront])
    const context = {
      ...base,
      setupEnvironment: { ...base.setupEnvironment, detectMainBranch: async () => await Promise.resolve("trunk") },
    }

    await expect(addRepository({ path: "/work/ledger-api", ...NOBODY_TRACKED }, context)).resolves.toMatchObject({
      kind: "accepted",
      repository: { baseBranch: "trunk" },
    })
  })

  it("rejects a base branch the repository does not have without changing the store", async () => {
    const context = createContext([storefront])

    await expect(addRepository({ path: "/work/ledger-api", ...NOBODY_TRACKED, baseBranch: "develop" }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "develop is not a branch of this repository.",
    })
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([storefront])
  })

  it("rejects an author the repository does not have", async () => {
    const context = createContext([storefront])

    await expect(
      addRepository({ path: "/work/ledger-api", trackedAuthorIds: ["ghost@acme.example"], baseBranch: null }, context),
    ).resolves.toStrictEqual({ kind: "rejected", message: "ghost@acme.example is not an author of this repository." })
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([storefront])
  })

  it("rejects a folder that is not a git repository without changing the store", async () => {
    const context = {
      ...createContext([storefront]),
      setupEnvironment: { ...createMockSetupEnvironment(), isRepositoryFolder: async () => await Promise.resolve(false) },
    }

    await expect(addRepository({ path: "/work/notes", ...NOBODY_TRACKED }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "/work/notes is not a git repository.",
    })
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([storefront])
  })

  it("rejects a path already on the list without changing the store", async () => {
    const context = createContext([storefront])

    await expect(addRepository({ path: "/work/storefront", ...NOBODY_TRACKED }, context)).resolves.toStrictEqual({
      kind: "rejected",
      message: "/work/storefront is already on the list.",
    })
    await expect(context.repositoryStore.list()).resolves.toStrictEqual([storefront])
  })
})
