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

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-416" }
const NO_DIAGRAM_REQUEST = { levels: null, isShowingData: null, isShowingAssumed: null }

const PAGE_REQUEST: GetReviewInput = {
  ...KEY,
  filterKeys: null,
  isShowingReviewed: false,
  journey: NO_DIAGRAM_REQUEST,
  blast: NO_DIAGRAM_REQUEST,
}

const DELIVERY_CHANGE: RecordedChange = {
  repositoryPath: "/Users/dev/projects/storefront",
  branchName: "feature/gift-card-balance",
  revision: { headCommit: "1111111aaaaaaa", baseCommit: "0000000bbbbbbb" },
  diff: [
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
  setupStore: new InMemorySetupStore({
    ...EMPTY_SETUP,
    agents: {
      installs: [{ agent: "claude", installPath: "/home/.claude", model: "default" }],
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
  it("builds the scaffold from the change and returns the prompt to paste when the reviewer prompts the agent", async () => {
    const spawner = new FakeSpawner()
    const context = createContext(spawner)

    const result = await requestReview(createInput(), context)

    expect(result).toMatchObject({ kind: "requested", message: "Prompt copied" })
    expect(result?.kind === "requested" ? result.prompt : null).toContain("Review pull request #416 of storefront")
    expect(spawner.launches).toStrictEqual([])
    await expect(getReview(PAGE_REQUEST, context)).resolves.toMatchObject({
      kind: "artifact",
      draftingNotice: { label: "Still being written" },
      staleNotice: null,
      segments: [
        {
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

  it("says so when the branch cannot be found in the repository folder", async () => {
    await expect(requestReview(createInput(), createContext(new FakeSpawner(), []))).resolves.toStrictEqual({
      kind: "unavailable",
      message: "Flight Plan cannot find this branch, or the main branch, in the repository folder. Fetch them and try again.",
    })
  })

  it("says so when the change touches no files", async () => {
    const emptyChange = { ...DELIVERY_CHANGE, diff: "" }

    await expect(requestReview(createInput(), createContext(new FakeSpawner(), [emptyChange]))).resolves.toStrictEqual({
      kind: "unavailable",
      message: "This change touches no files, so there is nothing to review.",
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
