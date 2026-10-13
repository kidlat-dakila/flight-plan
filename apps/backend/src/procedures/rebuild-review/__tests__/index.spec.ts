import { createConversationEnvironment, createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { deleteReview } from "@/procedures/delete-review"
import { FakeSpawner, SequentialIds } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { getRebuildForm } from "@/procedures/get-rebuild-form"
import { getReview } from "@/procedures/get-review"
import { InMemoryChangeReader, type RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { InMemoryReviewStore, type ReviewStore } from "@/procedures/get-review/utils/review-store"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { rebuildReview } from "@/procedures/rebuild-review"
import type { BranchPull, BranchPuller } from "@/procedures/rebuild-review/utils/branch-puller"
import type { RebuildReviewInput } from "@/procedures/rebuild-review/utils/schemas"
import { requestReview } from "@/procedures/request-review"
import { createChangeRepositoryOpener } from "@/procedures/request-review/__tests__/change-repository"
import { listJourneyNodes } from "@flightplan/codegraph"
import type { JourneyNode, ReviewArtifact, Waypoint } from "@flightplan/configurations"

const NOW = new Date("2026-10-12T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-416" }
const PATH = "src/delivery/estimate.ts"
const BASE_TEXTS = { [PATH]: "export const estimate = () => 2\nexport const label = () => \"slow\"\n" }
const ESTIMATE_LINES = ["export const estimate = (zone: string) =>", "  zone === \"local\" ? 1 : 3"]

const changeWith = (headCommit: string, labelLine: string): RecordedChange => ({
  repositoryPath: "/Users/dev/projects/storefront",
  branchName: "feature/gift-card-balance",
  revision: { headCommit, baseCommit: "0000000bbbbbbb" },
  diff: [
    `diff --git a/${PATH} b/${PATH}`,
    `--- a/${PATH}`,
    `+++ b/${PATH}`,
    "@@ -1,2 +1,3 @@",
    "-export const estimate = () => 2",
    "-export const label = () => \"slow\"",
    ...[...ESTIMATE_LINES, labelLine].map((line) => `+${line}`),
  ].join("\n"),
  changedPaths: [PATH],
  texts: { [PATH]: `${[...ESTIMATE_LINES, labelLine].join("\n")}\n` },
})

const FIRST_CHANGE = changeWith("1111111aaaaaaa", "export const label = () => \"fast\"")
const SECOND_CHANGE = changeWith("2222222aaaaaaa", "export const label = () => \"faster\"")

interface Harness {
  readonly reviewStore: ReviewStore
  readonly spawner: FakeSpawner
  readonly pullBranch: ReturnType<typeof vi.fn<BranchPuller>>
  readonly contextAt: (change: RecordedChange, pull?: BranchPull) => ProcedureContext
}

const createHarness = (): Harness => {
  const reviewStore = new InMemoryReviewStore([])
  const spawner = new FakeSpawner()
  const pullBranch = vi.fn<BranchPuller>()
  const conversationEnvironment = createConversationEnvironment({
    spawners: { claude: spawner.spawn },
    newId: new SequentialIds().next,
  })
  const setupStore = new InMemorySetupStore({
    ...EMPTY_SETUP,
    agents: {
      installs: [{ agent: "claude", installPath: "/home/.claude", model: "default", effort: "default" }],
      defaultAgent: "claude",
      connection: "direct",
    },
  })
  return {
    reviewStore,
    spawner,
    pullBranch,
    contextAt: (change, pull = { kind: "pulled" }) => ({
      ...createMockProcedureContext(NOW),
      reviewStore,
      setupStore,
      conversationEnvironment,
      changeReader: new InMemoryChangeReader([change]),
      openRepository: createChangeRepositoryOpener([{ change, baseTexts: BASE_TEXTS }]),
      pullBranch: pullBranch.mockResolvedValue(pull),
      now: () => NOW,
    }),
  }
}

const createInput = (overrides: Partial<RebuildReviewInput> = {}): RebuildReviewInput => ({
  ...KEY,
  mode: "update",
  preset: "onboardee",
  order: "along-the-path",
  customOrder: "",
  writer: { kind: "manual" },
  ...overrides,
})

const writeWaypoint = (waypoint: Waypoint): Waypoint => ({
  ...waypoint,
  title: `Title of ${waypoint.declaration}`,
  reading: `Reading of ${waypoint.declaration}`,
  children: waypoint.children.map(writeWaypoint),
})

const writeJourneyNode = (node: JourneyNode): JourneyNode => ({
  ...node,
  label: `Label of ${node.codeBlocks[0].name ?? ""}`,
  triggerLabels: node.triggerLabels.map((trigger) => ({ ...trigger, label: "Trigger" })),
  blockLabels: node.blockLabels.map((listed) => ({ ...listed, label: "Block" })),
  children: node.children.map(writeJourneyNode),
})

const writeEverything = (artifact: ReviewArtifact): ReviewArtifact => ({
  ...artifact,
  status: "complete",
  segments: artifact.segments.map((segment) => ({
    ...segment,
    title: "Delivery estimates",
    context: "Estimates depend on the zone now.",
    journey: segment.journey === null
      ? null
      : { ...segment.journey, description: "A shopper opens the cart, and the estimate is read.", journeyNodes: segment.journey.journeyNodes.map(writeJourneyNode) },
    walkthrough: {
      intro: "Start with the estimate.",
      files: segment.walkthrough.files.map((file) => ({
        ...file,
        title: "The estimate",
        waypoints: file.waypoints.map(writeWaypoint),
      })),
    },
  })),
})

const readingsOf = async (reviewStore: ReviewStore): Promise<Record<string, string>> => {
  const artifact = await reviewStore.findArtifact(KEY)
  return Object.fromEntries(
    (artifact?.segments ?? []).flatMap(waypointsOf).map(({ waypoint }) => [waypoint.declaration, waypoint.reading]),
  )
}

const journeyLabelsOf = async (reviewStore: ReviewStore): Promise<(string | null)[]> => {
  const artifact = await reviewStore.findArtifact(KEY)
  return (artifact?.segments ?? []).flatMap((segment) => listJourneyNodes(segment.journey?.journeyNodes ?? [])).map((node) => node.label)
}

const startWrittenReview = async (harness: Harness): Promise<void> => {
  await requestReview({ ...KEY, preset: "onboardee", order: "along-the-path", customOrder: "", writer: { kind: "manual" } }, harness.contextAt(FIRST_CHANGE))
  await harness.reviewStore.amendArtifact(KEY, (artifact) => ({ artifact: writeEverything(artifact), outcome: null }))
}

describe("rebuildReview", () => {
  it("pulls the branch and pins the rebuilt artifact to the new commit", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    const result = await rebuildReview(createInput(), harness.contextAt(SECOND_CHANGE))

    expect(result).toMatchObject({ kind: "rebuilt", message: "Prompt copied" })
    expect(harness.pullBranch).toHaveBeenCalledWith("/Users/dev/projects/storefront", "feature/gift-card-balance")
    await expect(harness.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ commit: "2222222aaaaaaa", status: "drafting" })
  })

  it("keeps what was written for code that did not change when it updates", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    await rebuildReview(createInput(), harness.contextAt(SECOND_CHANGE))

    await expect(readingsOf(harness.reviewStore)).resolves.toStrictEqual({ estimate: "Reading of estimate", label: "" })
    await expect(journeyLabelsOf(harness.reviewStore)).resolves.toStrictEqual(["Label of estimate", null])
    await expect(harness.reviewStore.findArtifact(KEY)).resolves.toMatchObject({
      segments: [{ context: "", walkthrough: { intro: null, files: [{ title: PATH }] } }],
    })
  })

  it("keeps everything and stays complete when the code did not change at all", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    const result = await rebuildReview(
      createInput({ writer: { kind: "agent", agent: "claude", model: "default", effort: "default" } }),
      harness.contextAt(FIRST_CHANGE),
    )

    expect(result).toStrictEqual({
      kind: "rebuilt",
      prompt: null,
      message: "The Flight Plan is up to date, and nothing in it needed rewriting",
    })
    expect(harness.spawner.launches).toStrictEqual([])
    await expect(harness.reviewStore.findArtifact(KEY)).resolves.toMatchObject({
      status: "complete",
      segments: [{ title: "Delivery estimates", context: "Estimates depend on the zone now.", walkthrough: { intro: "Start with the estimate.", files: [{ title: "The estimate" }] } }],
    })
  })

  it("erases everything that was written when it regenerates from scratch", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    await rebuildReview(createInput({ mode: "regenerate" }), harness.contextAt(FIRST_CHANGE))

    await expect(readingsOf(harness.reviewStore)).resolves.toStrictEqual({ estimate: "", label: "" })
    await expect(harness.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: "drafting" })
  })

  it("rewrites everything when an update chooses a different configuration", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    await rebuildReview(createInput({ preset: "standard" }), harness.contextAt(FIRST_CHANGE))

    await expect(readingsOf(harness.reviewStore)).resolves.toStrictEqual({ estimate: "", label: "" })
    await expect(harness.reviewStore.findRequest(KEY)).resolves.toMatchObject({ preset: "standard" })
  })

  it("starts the chosen agent on what is left to write", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)
    const writer = { kind: "agent", agent: "claude", model: "default", effort: "default" } as const

    await expect(rebuildReview(createInput({ writer }), harness.contextAt(SECOND_CHANGE))).resolves.toStrictEqual({
      kind: "rebuilt",
      prompt: null,
      message: "Review started",
    })
    expect(harness.spawner.launches).toHaveLength(1)
  })

  it("stops and says why when the branch cannot be pulled, leaving the artifact as it is", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    const result = await rebuildReview(createInput({ mode: "regenerate" }), harness.contextAt(SECOND_CHANGE, { kind: "failed", reason: "Could not resolve host: github.com" }))

    expect(result).toStrictEqual({
      kind: "unavailable",
      message: "The branch could not be pulled, so the Flight Plan was left as it is: Could not resolve host: github.com",
    })
    await expect(harness.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ commit: "1111111aaaaaaa", status: "complete" })
    await expect(readingsOf(harness.reviewStore)).resolves.toStrictEqual({ estimate: "Reading of estimate", label: "Reading of label" })
  })

  it("returns a rejected choice as data and leaves the artifact alone", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    await expect(rebuildReview(createInput({ order: "custom" }), harness.contextAt(SECOND_CHANGE))).resolves.toMatchObject({
      kind: "rejected",
      field: "customOrder",
    })
    await expect(harness.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ commit: "1111111aaaaaaa" })
  })

  it("returns null when there is no review artifact to rebuild", async () => {
    await expect(rebuildReview(createInput(), createHarness().contextAt(FIRST_CHANGE))).resolves.toBeNull()
  })
})

describe("getRebuildForm", () => {
  it("opens the update form on the stored choices and warns on every other configuration", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    const form = await getRebuildForm({ ...KEY, mode: "update" }, harness.contextAt(FIRST_CHANGE))

    expect(form).toMatchObject({
      title: "Update the Flight Plan",
      form: { configuration: { selectedPreset: "onboardee" }, order: { selectedOrder: "along-the-path" }, writer: { selectedKey: "manual" } },
    })
    expect(form?.description).toContain("commit 1111111")
    expect(form?.form.configuration.options.map((option) => [option.preset, option.rewriteNotice !== null])).toStrictEqual(
      expect.arrayContaining([["onboardee", false], ["standard", true]]),
    )
  })

  it("warns on no configuration when regenerating, since everything is rewritten anyway", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    const form = await getRebuildForm({ ...KEY, mode: "regenerate" }, harness.contextAt(FIRST_CHANGE))

    expect(form?.title).toBe("Regenerate from scratch")
    expect(form?.form.configuration.options.every((option) => option.rewriteNotice === null)).toBe(true)
  })
})

describe("deleteReview", () => {
  it("deletes the review artifact, so the page offers to start a review again", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)
    const context = harness.contextAt(FIRST_CHANGE)

    await expect(deleteReview(KEY, context)).resolves.toStrictEqual({ message: "Flight Plan deleted" })

    await expect(getReview({ ...KEY, filterKeys: null, isShowingReviewed: false }, context)).resolves.toMatchObject({ kind: "missing" })
    await expect(deleteReview(KEY, context)).resolves.toBeNull()
  })
})
