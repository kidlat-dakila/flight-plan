import { createConversationEnvironment, openSampleRepository, type ProcedureContext } from "@/procedures/context"
import { readSampleInstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { InMemoryChangeReader } from "@/procedures/get-review/utils/change-reader"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { createMockSetupEnvironment } from "@/procedures/get-setup/utils/mock-setup-environment"
import {
  EMPTY_SETUP,
  type AgentsChoice,
  type ForgesChoice,
  type RepositoryAuthor,
  type Setup,
  type SetupForge,
  type SetupRepository,
} from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { InMemoryRepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { skipBranchPull } from "@/procedures/rebuild-review/utils/branch-puller"
import { highlightAsPlainText } from "@flightplan/codegraph"

export const NOW = new Date("2026-10-01T12:00:00.000Z")

export const SAVED_AGENTS: AgentsChoice = {
  installs: [
    { agent: "claude", installPath: "/Users/dev/.claude", model: "default", effort: "default" },
    { agent: "codex", installPath: "/Users/dev/.codex", model: "default", effort: "default" },
  ],
  defaultAgent: "codex",
  connection: "manual",
}

export const LOCAL_GIT_FORGES: ForgesChoice = {
  connections: [{ forge: "git", username: "", baseUrl: "", hasCredential: false }],
  defaultForge: "git",
}

export const GITHUB_FORGES: ForgesChoice = {
  connections: [
    { forge: "gh", username: "", baseUrl: "", hasCredential: false },
    { forge: "github", username: "", baseUrl: "https://github.acme.example", hasCredential: true },
  ],
  defaultForge: "gh",
}

export const LENA: RepositoryAuthor = {
  id: "lena@acme.example",
  name: "Lena Okafor",
  detail: "lena@acme.example",
  avatarUrl: null,
}

export const DEV: RepositoryAuthor = {
  id: "dev@acme.example",
  name: "Dev Harper",
  detail: "dev@acme.example",
  avatarUrl: null,
}

export const CHECKOUT_WEB: SetupRepository = {
  name: "checkout-web",
  path: "/Users/dev/projects/checkout-web",
  selfAuthor: null,
  trackedAuthors: [],
}

export const AT_FORGES: Setup = { ...EMPTY_SETUP, agents: SAVED_AGENTS }

export const AT_CONFIGURATION: Setup = { ...AT_FORGES, forges: LOCAL_GIT_FORGES }

export const AT_REPOSITORIES: Setup = { ...AT_CONFIGURATION, preset: "minimal" }

export const READY_TO_FINISH: Setup = {
  ...AT_REPOSITORIES,
  repositories: [{ ...CHECKOUT_WEB, selfAuthor: DEV, trackedAuthors: [LENA] }],
}

export const STOREFRONT: Repository = {
  name: "storefront",
  path: "/Users/dev/projects/storefront",
  forge: "gh",
  forgeSlug: "acme/storefront",
  problem: null,
  hasFollowedAuthors: true,
  targets: [],
}

export const createSetupContext = (setup: Setup, repositories: readonly Repository[] = []): ProcedureContext => ({
  repositoryStore: new InMemoryRepositoryStore(repositories),
  reviewStore: new InMemoryReviewStore([]),
  changeReader: new InMemoryChangeReader([]),
  pullBranch: skipBranchPull,
  openRepository: openSampleRepository,
  setupStore: new InMemorySetupStore(setup),
  setupEnvironment: createMockSetupEnvironment(),
  conversationEnvironment: createConversationEnvironment(),
  highlightCode: highlightAsPlainText,
  readInstructionTexts: readSampleInstructionTexts,
  now: () => NOW,
  dataNotice: null,
})

export const servedByForge = (context: ProcedureContext, forge: SetupForge): ProcedureContext => ({
  ...context,
  setupEnvironment: {
    ...context.setupEnvironment,
    findRepositoryForge: async () => await Promise.resolve(forge),
  },
})
