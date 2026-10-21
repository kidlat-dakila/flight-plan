import { createConversationEnvironment, createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { FakeSpawner, SequentialIds } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { getReview } from "@/procedures/get-review"
import type { BranchPull, BranchPuller } from "@/procedures/get-review/utils/branch-puller"
import { InMemoryChangeReader, type RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { InMemoryReviewStore, type ReviewStore } from "@/procedures/get-review/utils/review-store"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { createChangeRepositoryOpener } from "@/procedures/request-review/__tests__/change-repository"
import { listTraceNodes } from "@flightplan/codegraph"
import type { TraceNode, ReviewArtifact, Waypoint } from "@flightplan/configurations"

const NOW = new Date("2026-10-12T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-416" }
const PAGE_INPUT = { ...KEY, filterKeys: [], isShowingReviewed: false }
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
    defaultConfiguration: "onboardee",
    agents: {
      installs: [{ agent: "claude", installPath: "/home/.claude", model: "default", effort: "default" }],
      defaultAgent: "claude",
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

const writeWaypoint = (waypoint: Waypoint): Waypoint => ({
  ...waypoint,
  title: `Title of ${waypoint.declaration}`,
  reading: `Reading of ${waypoint.declaration}`,
  children: waypoint.children.map(writeWaypoint),
})

const writeTraceNode = (node: TraceNode): TraceNode => ({
  ...node,
  label: `Label of ${node.codeBlocks[0].name ?? ""}`,
  triggerLabels: node.triggerLabels.map((trigger) => ({ ...trigger, label: "Trigger" })),
  blockLabels: node.blockLabels.map((listed) => ({ ...listed, label: "Block" })),
  children: node.children.map(writeTraceNode),
})

const writeEverything = (artifact: ReviewArtifact): ReviewArtifact => ({
  ...artifact,
  status: "complete",
  segments: artifact.segments.map((segment) => ({
    ...segment,
    title: "Delivery estimates",
    context: "Estimates depend on the zone now.",
    traceDiagram: segment.traceDiagram === null
      ? null
      : { ...segment.traceDiagram, description: "A shopper opens the cart, and the estimate is read.", traceNodes: segment.traceDiagram.traceNodes.map(writeTraceNode) },
    walkthrough: {
      files: segment.walkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map(writeWaypoint) })),
    },
  })),
  contextCodeBlocks: artifact.contextCodeBlocks.map((listed) => ({ ...listed, description: `Description of ${listed.codeBlock?.name ?? listed.name ?? ""}` })),
})

const contextDescriptionsOf = async (reviewStore: ReviewStore): Promise<Record<string, string | null>> => {
  const artifact = await reviewStore.findArtifact(KEY)
  return Object.fromEntries((artifact?.contextCodeBlocks ?? []).map(({ codeBlock, name, isRequired, description }) => [codeBlock?.name ?? name ?? "", isRequired ? description : "not required"]))
}

const readingsOf = async (reviewStore: ReviewStore): Promise<Record<string, string>> => {
  const artifact = await reviewStore.findArtifact(KEY)
  return Object.fromEntries(
    (artifact?.segments ?? []).flatMap(waypointsOf).map(({ waypoint }) => [waypoint.declaration, waypoint.reading]),
  )
}

const traceLabelsOf = async (reviewStore: ReviewStore): Promise<(string | null)[]> => {
  const artifact = await reviewStore.findArtifact(KEY)
  return (artifact?.segments ?? []).flatMap((segment) => listTraceNodes(segment.traceDiagram?.traceNodes ?? [])).map((node) => node.label)
}

const startWrittenReview = async (harness: Harness): Promise<void> => {
  await getReview(PAGE_INPUT, harness.contextAt(FIRST_CHANGE))
  await harness.reviewStore.amendArtifact(KEY, (artifact) => ({ artifact: writeEverything(artifact), outcome: null }))
}

describe("getReview on a target that moved", () => {
  it("pulls the branch and pins the stored review to the new commit, staying complete", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    await getReview(PAGE_INPUT, harness.contextAt(SECOND_CHANGE))

    expect(harness.pullBranch).toHaveBeenCalledWith("/Users/dev/projects/storefront", "feature/gift-card-balance")
    await expect(harness.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ commit: "2222222aaaaaaa", status: "complete" })
    expect(harness.spawner.launches).toStrictEqual([])
  })

  it("keeps what was written for code that did not change, and leaves the new code unwritten", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    await getReview(PAGE_INPUT, harness.contextAt(SECOND_CHANGE))

    await expect(readingsOf(harness.reviewStore)).resolves.toStrictEqual({ estimate: "Reading of estimate", label: "" })
    await expect(traceLabelsOf(harness.reviewStore)).resolves.toStrictEqual(["Label of estimate", null])
    await expect(contextDescriptionsOf(harness.reviewStore)).resolves.toMatchObject({ estimate: "Description of estimate" })
  })

  it("rebuilds nothing while the head has not moved", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    await getReview(PAGE_INPUT, harness.contextAt(FIRST_CHANGE))

    expect(harness.pullBranch).not.toHaveBeenCalled()
    await expect(readingsOf(harness.reviewStore)).resolves.toStrictEqual({ estimate: "Reading of estimate", label: "Reading of label" })
  })

  it("leaves a review an agent is writing alone", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)
    await harness.reviewStore.amendArtifact(KEY, (artifact) => ({ artifact: { ...artifact, status: "drafting" }, outcome: null }))

    await getReview(PAGE_INPUT, harness.contextAt(SECOND_CHANGE))

    expect(harness.pullBranch).not.toHaveBeenCalled()
    await expect(harness.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ commit: "1111111aaaaaaa" })
  })

  it("leaves the stored review as it is when the branch cannot be pulled, and still says it is stale", async () => {
    const harness = createHarness()
    await startWrittenReview(harness)

    const page = await getReview(PAGE_INPUT, harness.contextAt(SECOND_CHANGE, { kind: "failed", reason: "Could not resolve host: github.com" }))

    await expect(harness.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ commit: "1111111aaaaaaa", status: "complete" })
    expect(page).toMatchObject({ kind: "artifact", staleNotice: { promptLabel: "Copy the update prompt" } })
  })
})
