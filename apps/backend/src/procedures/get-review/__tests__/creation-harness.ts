import { vi } from "vitest"
import { createConversationEnvironment, createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { SequentialIds } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { InMemoryChangeReader, type ChangeReader, type RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { InMemoryConfigurationStore } from "@/procedures/list-configurations/utils/configuration-store"
import { createMockRepositories } from "@/procedures/list-repositories/utils/mock-repositories"
import { InMemoryRepositoryStore } from "@/procedures/list-repositories/utils/repository-store"
import { createChangeRepositoryOpener } from "@/procedures/request-review/__tests__/change-repository"
import type { OpenedRepository, RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import type { ReviewTarget } from "@flightplan/git-forge"

export const NOW = new Date("2026-10-01T12:00:00.000Z")
export const KEY = { repositoryName: "storefront", targetId: "pr-416" }
export const BRANCH_KEY = { repositoryName: "storefront", targetId: "branch-spike/unlisted" }
export const PAGE_INPUT = { ...KEY, filterKeys: [], isShowingReviewed: false }
export const ESTIMATE_PATH = "src/delivery/estimate.ts"
export const TEST_PATH = "src/delivery/estimate.test.ts"
export const BASE_TEXTS = { [ESTIMATE_PATH]: "export const estimate = () => 2\n" }
const STOREFRONT_PATH = "/Users/dev/projects/storefront"

export const DELIVERY_CHANGE: RecordedChange = {
  repositoryPath: STOREFRONT_PATH,
  branchName: "feature/gift-card-balance",
  revision: { headCommit: "1111111aaaaaaa", baseCommit: "0000000bbbbbbb" },
  diff: [
    `diff --git a/${ESTIMATE_PATH} b/${ESTIMATE_PATH}`,
    `--- a/${ESTIMATE_PATH}`,
    `+++ b/${ESTIMATE_PATH}`,
    "@@ -1 +1,2 @@",
    "-export const estimate = () => 2",
    "+export const estimate = (zone: string) =>",
    "+  zone === \"local\" ? 1 : 3",
  ].join("\n"),
  changedPaths: [ESTIMATE_PATH],
  texts: { [ESTIMATE_PATH]: "export const estimate = (zone: string) =>\n  zone === \"local\" ? 1 : 3\n" },
}

export const TESTED_CHANGE: RecordedChange = {
  ...DELIVERY_CHANGE,
  diff: [
    DELIVERY_CHANGE.diff,
    `diff --git a/${TEST_PATH} b/${TEST_PATH}`,
    "new file mode 100644",
    "--- /dev/null",
    `+++ b/${TEST_PATH}`,
    "@@ -0,0 +1 @@",
    "+import { estimate } from \"./estimate\"",
  ].join("\n"),
  changedPaths: [ESTIMATE_PATH, TEST_PATH],
  texts: { ...DELIVERY_CHANGE.texts, [TEST_PATH]: "import { estimate } from \"./estimate\"\n" },
}

export const AGENT_SETUP: Setup = {
  ...EMPTY_SETUP,
  agents: {
    installs: [{ agent: "claude", installPath: "/home/.claude", model: "default", effort: "default" }],
    defaultAgent: "claude",
    terminalApp: "terminal",
  },
}

export interface CreationOptions {
  readonly changes?: readonly RecordedChange[]
  readonly checkedOutBranches?: readonly string[]
  readonly pullRequestBase?: string | null
  readonly repositoryBaseBranch?: string | null
  readonly setup?: Setup
}

const DEFAULT_CHECKED_OUT_BRANCHES: readonly string[] = ["main", "develop", "trunk"]

export const comparingChangeReader = (changes: readonly RecordedChange[], checkedOutBranches: readonly string[]): ChangeReader => {
  const reader = new InMemoryChangeReader(changes)
  return {
    findRevision: async (repositoryPath, branchName, baseBranch) =>
      baseBranch !== null && !checkedOutBranches.includes(baseBranch)
        ? await Promise.resolve(null)
        : await reader.findRevision(repositoryPath, branchName),
    readDiff: reader.readDiff,
    listChangedPaths: reader.listChangedPaths,
    listPaths: reader.listPaths,
    readFile: reader.readFile,
  }
}

const forgeTargetOf = (number: number, baseRef: string): ReviewTarget => ({
  ref: { kind: "pr", number },
  title: "Show the gift card balance at checkout",
  author: "lena",
  url: "",
  updatedAt: NOW.toISOString(),
  isDraft: false,
  baseRef,
  reason: "query",
})

const withPullRequestBase = (opened: OpenedRepository, baseRef: string | null): OpenedRepository =>
  !opened.resolved.ok || baseRef === null
    ? opened
    : {
        ...opened,
        resolved: {
          ...opened.resolved,
          gitAdapter: {
            ...opened.resolved.gitAdapter,
            target: async (ref) => await Promise.resolve(ref.kind === "pr" ? forgeTargetOf(ref.number, baseRef) : null),
          },
        },
      }

export const createRecordingOpener = (changes: readonly RecordedChange[], pullRequestBase: string | null) => {
  const open = createChangeRepositoryOpener(changes.map((change) => ({ change, baseTexts: BASE_TEXTS })))
  return vi.fn<RepositoryAdapterOpener>(async (path, forges, baseBranch) => withPullRequestBase(await open(path, forges, baseBranch), pullRequestBase))
}

const repositoryStoreWith = (baseBranch: string | null): InMemoryRepositoryStore =>
  new InMemoryRepositoryStore(createMockRepositories(NOW).map((repository) => ({ ...repository, baseBranch })))

export const createCreationContext = ({
  changes = [DELIVERY_CHANGE],
  checkedOutBranches = DEFAULT_CHECKED_OUT_BRANCHES,
  pullRequestBase = null,
  repositoryBaseBranch = null,
  setup = AGENT_SETUP,
}: CreationOptions = {}): ProcedureContext & { readonly openRepository: ReturnType<typeof createRecordingOpener> } => ({
  ...createMockProcedureContext(NOW),
  repositoryStore: repositoryStoreWith(repositoryBaseBranch),
  reviewStore: new InMemoryReviewStore([]),
  changeReader: comparingChangeReader(changes, checkedOutBranches),
  openRepository: createRecordingOpener(changes, pullRequestBase),
  setupStore: new InMemorySetupStore(setup),
  configurationStore: new InMemoryConfigurationStore([]),
  conversationEnvironment: createConversationEnvironment({ newId: new SequentialIds().next }),
  now: () => NOW,
})
