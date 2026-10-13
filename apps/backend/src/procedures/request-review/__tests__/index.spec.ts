import { createConversationEnvironment, createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { FakeSpawner, SequentialIds } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { getReview } from "@/procedures/get-review"
import { InMemoryChangeReader, type RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import type { GetReviewInput } from "@/procedures/get-review/utils/schemas"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { requestReview } from "@/procedures/request-review"
import type { RequestReviewInput } from "@/procedures/request-review/utils/schemas"
import { createChangeRepositoryOpener } from "./change-repository"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-416" }
const PAGE_REQUEST: GetReviewInput = {
  ...KEY,
  filterKeys: null,
  isShowingReviewed: false,
}

const DELIVERY_CHANGE: RecordedChange = {
  repositoryPath: "/Users/dev/projects/storefront",
  branchName: "feature/gift-card-balance",
  revision: { headCommit: "1111111aaaaaaa", baseCommit: "0000000bbbbbbb" },
  diff: [
    "diff --git a/src/delivery/estimate.ts b/src/delivery/estimate.ts",
    "--- a/src/delivery/estimate.ts",
    "+++ b/src/delivery/estimate.ts",
    "@@ -1 +1,2 @@",
    "-export const estimate = () => 2",
    "+export const estimate = (zone: string) =>",
    "+  zone === \"local\" ? 1 : 3",
  ].join("\n"),
  changedPaths: ["src/delivery/estimate.ts"],
  texts: { "src/delivery/estimate.ts": "export const estimate = (zone: string) =>\n  zone === \"local\" ? 1 : 3\n" },
}

const DELIVERY_BASE_TEXTS = { "src/delivery/estimate.ts": "export const estimate = () => 2\n" }

const createInput = (overrides: Partial<RequestReviewInput> = {}): RequestReviewInput => ({
  ...KEY,
  preset: "minimal",
  order: "along-the-path",
  customOrder: "",
  writer: { kind: "manual" },
  ...overrides,
})

const createContext = (spawner = new FakeSpawner(), changes: readonly RecordedChange[] = [DELIVERY_CHANGE]): ProcedureContext => ({
  ...createMockProcedureContext(NOW),
  reviewStore: new InMemoryReviewStore([]),
  changeReader: new InMemoryChangeReader(changes),
  openRepository: createChangeRepositoryOpener(changes.map((change) => ({ change, baseTexts: DELIVERY_BASE_TEXTS }))),
  setupStore: new InMemorySetupStore({
    ...EMPTY_SETUP,
    agents: {
      installs: [{ agent: "claude", installPath: "/home/.claude", model: "default", effort: "default" }],
      defaultAgent: "claude",
      connection: "direct",
    },
  }),
  conversationEnvironment: createConversationEnvironment({
    spawners: { claude: spawner.spawn },
    newId: new SequentialIds().next,
  }),
  now: () => NOW,
})

describe("requestReview", () => {
  it("builds the review artifact from the change and returns the prompt to paste when the reviewer prompts the agent", async () => {
    const spawner = new FakeSpawner()
    const context = createContext(spawner)

    const result = await requestReview(createInput(), context)

    expect(result).toMatchObject({ kind: "requested", message: "Prompt copied" })
    expect(result?.kind === "requested" ? result.prompt : null).toContain("Review pull request #416 of storefront")
    expect(spawner.launches).toStrictEqual([])
    await expect(getReview(PAGE_REQUEST, context)).resolves.toMatchObject({
      kind: "artifact",
      progress: { state: "waiting", label: "Waiting for your agent", prompt: { label: "Copy the prompt" } },
      staleNotice: null,
      segments: [
        {
          blast: { heading: "Blast Diagram", views: [{ id: "export-bound", summary: ["1 file", "1 changed", "0 imports"] }, { id: "import-bound" }] },
          walkthrough: {
            coverageLabel: "All 1 changed file",
            files: [{ path: "src/delivery/estimate.ts" }],
          },
        },
      ],
    })
  })

  it("keeps the reviewer's choices with the scaffold", async () => {
    const context = createContext()

    await requestReview(createInput({ order: "custom", customOrder: " Tests first. " }), context)

    await expect(context.reviewStore.findRequest(KEY)).resolves.toStrictEqual({
      preset: "minimal",
      order: "custom",
      customOrder: "Tests first.",
      writer: { kind: "manual" },
      requestedAt: NOW,
    })
  })

  it("starts the chosen agent with its model, its effort and the prompt, without the configuration", async () => {
    const spawner = new FakeSpawner()
    const context = createContext(spawner)
    const writer = { kind: "agent", agent: "claude", model: "opus", effort: "max" } as const

    await expect(requestReview(createInput({ writer }), context)).resolves.toStrictEqual({
      kind: "requested",
      message: "Review started",
      prompt: null,
    })
    expect(spawner.launches).toMatchObject([
      {
        agent: "claude",
        model: "opus",
        effort: "max",
        workingPath: "/Users/dev/projects/storefront",
        isResume: false,
      },
    ])
    expect(spawner.launches[0]?.prompt).toContain("Order the Code Walkthrough along the path")
    expect(spawner.launches[0]?.prompt).not.toContain("Minimal")
    expect(spawner.launches[0]?.instructions).toContain("send-message")
  })

  it("keeps the scaffold and says why when the agent cannot start", async () => {
    const context = createContext(new FakeSpawner({ failure: "The claude command was not found on this machine." }))
    const writer = { kind: "agent", agent: "claude", model: "default", effort: "default" } as const

    await expect(requestReview(createInput({ writer }), context)).resolves.toStrictEqual({
      kind: "requested",
      prompt: null,
      message: "The review is ready to read, but the agent did not start: The claude command was not found on this machine.",
    })
    await expect(getReview(PAGE_REQUEST, context)).resolves.toMatchObject({ kind: "artifact" })
  })

  it("returns a rejection and builds nothing when the request cannot be made", async () => {
    const context = createContext()

    await expect(requestReview(createInput({ order: "custom", customOrder: " " }), context)).resolves.toMatchObject({
      kind: "rejected",
      field: "customOrder",
    })
    await expect(getReview(PAGE_REQUEST, context)).resolves.toMatchObject({ kind: "missing" })
  })

  it("rejects an effort the chosen model does not list and builds nothing", async () => {
    const context = createContext()
    const writer = { kind: "agent", agent: "claude", model: "haiku", effort: "max" } as const

    await expect(requestReview(createInput({ writer }), context)).resolves.toStrictEqual({
      kind: "rejected",
      field: "effort",
      message: "Haiku does not offer this effort.",
    })
    await expect(getReview(PAGE_REQUEST, context)).resolves.toMatchObject({ kind: "missing" })
  })

  it("says so when the branch is not in the repository folder", async () => {
    const otherBranch = { ...DELIVERY_CHANGE, branchName: "feature/other" }

    await expect(requestReview(createInput(), createContext(new FakeSpawner(), [otherBranch]))).resolves.toStrictEqual({
      kind: "unavailable",
      message: "feature/gift-card-balance is not in this checkout. Fetch it and try again.",
    })
  })

  it("says so when the repository cannot be opened", async () => {
    await expect(requestReview(createInput(), createContext(new FakeSpawner(), []))).resolves.toStrictEqual({
      kind: "unavailable",
      message: "This folder is not a git repository.",
    })
  })

  it("says so when the change touches no files", async () => {
    const emptyChange = { ...DELIVERY_CHANGE, diff: "", texts: DELIVERY_BASE_TEXTS }

    await expect(requestReview(createInput(), createContext(new FakeSpawner(), [emptyChange]))).resolves.toStrictEqual({
      kind: "unavailable",
      message: "This change touches no files, so there is nothing to review.",
    })
  })

  it("builds the structure and starts no agent when the author writes the Flight Plan", async () => {
    const spawner = new FakeSpawner()
    const context = createContext(spawner)

    await expect(requestReview(createInput({ writer: { kind: "author", start: "scaffold" } }), context)).resolves.toStrictEqual({
      kind: "requested",
      prompt: null,
      message: "Flight Plan created",
    })
    expect(spawner.launches).toStrictEqual([])
    await expect(getReview(PAGE_REQUEST, context)).resolves.toMatchObject({
      kind: "artifact",
      progress: null,
      segments: [{ walkthrough: { files: [{ path: "src/delivery/estimate.ts" }] } }],
    })
  })

  it("creates a Flight Plan with no segments when the author starts empty", async () => {
    const context = createContext()

    await requestReview(createInput({ writer: { kind: "author", start: "empty" } }), context)

    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({
      segments: [],
      changedPaths: ["src/delivery/estimate.ts"],
    })
    await expect(getReview(PAGE_REQUEST, context)).resolves.toMatchObject({ kind: "artifact", segments: [] })
  })

  it("creates a Flight Plan for a branch of the checkout that is not listed", async () => {
    const unlistedChange = { ...DELIVERY_CHANGE, branchName: "spike/unlisted" }
    const context = createContext(new FakeSpawner(), [unlistedChange])
    const branchKey = { repositoryName: "storefront", targetId: "branch-spike/unlisted" }

    await expect(
      requestReview(createInput({ ...branchKey, writer: { kind: "author", start: "scaffold" } }), context),
    ).resolves.toMatchObject({ kind: "requested" })
    await expect(getReview({ ...PAGE_REQUEST, ...branchKey }, context)).resolves.toMatchObject({
      kind: "artifact",
      shell: { header: { kind: "branch", branch: "spike/unlisted" } },
    })
  })

  it("asks for a review target when none is chosen", async () => {
    await expect(requestReview(createInput({ targetId: "" }), createContext())).resolves.toStrictEqual({
      kind: "rejected",
      field: "target",
      message: "Choose a pull request or a branch.",
    })
  })

  it("reports nothing for a review target that is not listed or already has a review artifact", async () => {
    const context = createContext()

    await expect(requestReview(createInput({ repositoryName: "gone" }), context)).resolves.toBeNull()
    await expect(requestReview(createInput({ targetId: "pr-1" }), context)).resolves.toBeNull()
    await expect(
      requestReview(createInput({ targetId: "pr-412" }), { ...context, reviewStore: createMockProcedureContext(NOW).reviewStore }),
    ).resolves.toBeNull()
  })
})
