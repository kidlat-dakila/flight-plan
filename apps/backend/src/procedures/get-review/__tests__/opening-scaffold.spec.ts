import { createConversationEnvironment, createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { FakeSpawner, SequentialIds } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { getReview } from "@/procedures/get-review"
import { InMemoryChangeReader, type RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import type { GetReviewInput } from "@/procedures/get-review/utils/schemas"
import { EMPTY_SETUP, type Setup } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { shippedConfigurationOf } from "@/procedures/list-configurations/utils/configuration"
import { InMemoryConfigurationStore } from "@/procedures/list-configurations/utils/configuration-store"
import { createChangeRepositoryOpener } from "@/procedures/request-review/__tests__/change-repository"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-416" }
const BRANCH_KEY = { repositoryName: "storefront", targetId: "branch-spike/unlisted" }
const PAGE_INPUT: GetReviewInput = { ...KEY, filterKeysBySegment: {}, reviewedSegmentIds: [] }
const ESTIMATE_PATH = "src/delivery/estimate.ts"
const TEST_PATH = "src/delivery/estimate.test.ts"

const DELIVERY_CHANGE: RecordedChange = {
  repositoryPath: "/Users/dev/projects/storefront",
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

const BASE_TEXTS = { [ESTIMATE_PATH]: "export const estimate = () => 2\n" }

const TESTED_CHANGE: RecordedChange = {
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

const AGENT_SETUP: Setup = {
  ...EMPTY_SETUP,
  agents: {
    installs: [{ agent: "claude", installPath: "/home/.claude", model: "default", effort: "default" }],
    defaultAgent: "claude",
  },
}

const createContext = (spawner: FakeSpawner, changes: readonly RecordedChange[] = [DELIVERY_CHANGE], setup: Setup = AGENT_SETUP): ProcedureContext => ({
  ...createMockProcedureContext(NOW),
  reviewStore: new InMemoryReviewStore([]),
  changeReader: new InMemoryChangeReader(changes),
  openRepository: createChangeRepositoryOpener(changes.map((change) => ({ change, baseTexts: BASE_TEXTS }))),
  setupStore: new InMemorySetupStore(setup),
  configurationStore: new InMemoryConfigurationStore([]),
  conversationEnvironment: createConversationEnvironment({ spawners: { claude: spawner.spawn }, newId: new SequentialIds().next }),
  now: () => NOW,
})

describe("getReview of a target with no review artifact", () => {
  it("builds the review from the change on open, asks no agent to write it, and shows it", async () => {
    const spawner = new FakeSpawner()
    const context = createContext(spawner)

    await expect(getReview(PAGE_INPUT, context)).resolves.toMatchObject({
      kind: "artifact",
      isOwn: false,
      progress: null,
      staleNotice: null,
      segments: [
        {
          blastDiagram: { heading: "Blast Diagram", views: [{ id: "export-bound", summary: ["1 file", "1 changed", "0 imports"] }, { id: "import-bound" }] },
          walkthrough: { coverageLabel: "All 1 changed file", files: [{ path: ESTIMATE_PATH }] },
        },
      ],
    })
    expect(spawner.launches).toStrictEqual([])
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({
      status: "complete",
      segments: [{ isContextRequired: false, walkthrough: { files: [{ waypoints: [{ isRequired: false }] }] } }],
    })
  })

  it("keeps the default prompt configuration with the stored review", async () => {
    const context = {
      ...createContext(new FakeSpawner(), [DELIVERY_CHANGE], { ...AGENT_SETUP, defaultConfiguration: "terse" }),
      configurationStore: new InMemoryConfigurationStore([{ ...shippedConfigurationOf("onboardee"), id: "terse", name: "Terse" }]),
    }

    await getReview(PAGE_INPUT, context)

    await expect(context.reviewStore.findRequest(KEY)).resolves.toStrictEqual({
      configurationId: "terse",
      preset: "onboardee",
      order: "foundations-first",
      customOrder: null,
      writer: { kind: "none" },
      requestedAt: NOW,
    })
  })

  it("falls back to the shipped default configuration when the chosen one is gone", async () => {
    const context = createContext(new FakeSpawner(), [DELIVERY_CHANGE], { ...AGENT_SETUP, defaultConfiguration: "gone" })

    await getReview(PAGE_INPUT, context)

    await expect(context.reviewStore.findRequest(KEY)).resolves.toMatchObject({ configurationId: "standard", preset: "standard" })
  })

  it("leaves out the changed files the ignored paths of the review preferences match", async () => {
    const context = createContext(new FakeSpawner(), [TESTED_CHANGE])

    await getReview(PAGE_INPUT, context)

    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({
      changedPaths: [ESTIMATE_PATH],
      segments: [{ changedPaths: [ESTIMATE_PATH], walkthrough: { files: [{ path: ESTIMATE_PATH }] } }],
    })
  })

  it("builds the author's own branch for the author to write, even a branch the checkout has but Flight Plan does not list", async () => {
    const context = createContext(new FakeSpawner(), [{ ...DELIVERY_CHANGE, branchName: "spike/unlisted" }])

    await expect(getReview({ ...PAGE_INPUT, ...BRANCH_KEY }, context)).resolves.toMatchObject({
      kind: "artifact",
      isOwn: true,
      progress: null,
      shell: { header: { kind: "branch", branch: "spike/unlisted" } },
    })
    await expect(context.reviewStore.findArtifact(BRANCH_KEY)).resolves.toMatchObject({ status: "authoring" })
    await expect(context.reviewStore.findRequest(BRANCH_KEY)).resolves.toMatchObject({ writer: { kind: "author", start: "scaffold" } })
  })

  it("builds the review once and reads the stored one after", async () => {
    const context = createContext(new FakeSpawner())
    await getReview(PAGE_INPUT, context)
    const first = await context.reviewStore.findArtifact(KEY)

    await getReview(PAGE_INPUT, context)

    await expect(context.reviewStore.findArtifact(KEY)).resolves.toBe(first)
  })

  it("says why and stores nothing when the branch is not in the repository folder", async () => {
    const context = createContext(new FakeSpawner(), [{ ...DELIVERY_CHANGE, branchName: "feature/other" }])

    await expect(getReview(PAGE_INPUT, context)).resolves.toMatchObject({
      kind: "missing",
      heading: "Flight Plan could not build this review",
      message: "feature/gift-card-balance is not in this checkout. Fetch it and try again.",
    })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toBeNull()
  })

  it("says so when the repository cannot be opened", async () => {
    await expect(getReview(PAGE_INPUT, createContext(new FakeSpawner(), []))).resolves.toMatchObject({
      kind: "missing",
      message: "This folder is not a git repository.",
    })
  })

  it("says so when the change touches no files", async () => {
    const emptyChange = { ...DELIVERY_CHANGE, diff: "", texts: BASE_TEXTS }

    await expect(getReview(PAGE_INPUT, createContext(new FakeSpawner(), [emptyChange]))).resolves.toMatchObject({
      kind: "missing",
      message: "This change touches no files, so there is nothing to review.",
    })
  })
})
