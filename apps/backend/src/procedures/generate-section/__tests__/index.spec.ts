import { createConversationEnvironment, createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { generateSection } from "@/procedures/generate-section"
import { FakeSpawner, SequentialIds } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import { getReview } from "@/procedures/get-review"
import { InMemoryChangeReader, type RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { InMemoryConfigurationStore } from "@/procedures/list-configurations/utils/configuration-store"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { requestReview } from "@/procedures/request-review"
import { createChangeRepositoryOpener } from "@/procedures/request-review/__tests__/change-repository"
import type { RequestReviewInput } from "@/procedures/request-review/utils/schemas"
import { updateNodes } from "@/procedures/update-nodes"

const NOW = new Date("2026-10-13T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-416" }
const PATH = "src/delivery/estimate.ts"
const PAGE_REQUEST = { ...KEY, filterKeysBySegment: {}, reviewedSegmentIds: [] }

const DELIVERY_CHANGE: RecordedChange = {
  repositoryPath: "/Users/dev/projects/storefront",
  branchName: "feature/gift-card-balance",
  revision: { headCommit: "1111111aaaaaaa", baseCommit: "0000000bbbbbbb" },
  diff: [
    `diff --git a/${PATH} b/${PATH}`,
    `--- a/${PATH}`,
    `+++ b/${PATH}`,
    "@@ -1 +1,2 @@",
    "-export const estimate = () => 2",
    "+export const estimate = (zone: string) =>",
    "+  zone === \"local\" ? 1 : 3",
  ].join("\n"),
  changedPaths: [PATH],
  texts: { [PATH]: "export const estimate = (zone: string) =>\n  zone === \"local\" ? 1 : 3\n" },
}

const createContext = (spawner = new FakeSpawner()): ProcedureContext => ({
  ...createMockProcedureContext(NOW),
  reviewStore: new InMemoryReviewStore([]),
  changeReader: new InMemoryChangeReader([DELIVERY_CHANGE]),
  openRepository: createChangeRepositoryOpener([{ change: DELIVERY_CHANGE, baseTexts: { [PATH]: "export const estimate = () => 2\n" } }]),
  setupStore: new InMemorySetupStore({
    ...EMPTY_SETUP,
    agents: {
      installs: [{ agent: "claude", installPath: "/home/.claude", model: "default", effort: "default" }],
      defaultAgent: "claude",
      connection: "direct",
    },
  }),
  configurationStore: new InMemoryConfigurationStore([]),
  conversationEnvironment: createConversationEnvironment({
    spawners: { claude: spawner.spawn },
    newId: new SequentialIds().next,
  }),
  now: () => NOW,
})

const requestWith = async (context: ProcedureContext, overrides: Partial<RequestReviewInput> = {}): Promise<void> => {
  await requestReview({ ...KEY, configurationId: "minimal", order: "along-the-path", customOrder: "", writer: { kind: "manual" }, ...overrides }, context)
}

const AGENT_WRITER = { kind: "agent", agent: "claude", model: "default", effort: "default" } as const

describe("generateSection", () => {
  it("leaves the diagrams and the findings of a configuration that switches them off out of the requested review", async () => {
    const context = createContext()

    await requestWith(context)

    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({
      sections: { traceDiagram: false, blastDiagram: false, walkthrough: true, findings: false },
      segments: [{ traceDiagram: null, blastDiagram: null, walkthrough: { files: [{ path: PATH }] } }],
    })
    await expect(getReview(PAGE_REQUEST, context)).resolves.toMatchObject({
      segments: [{
        traceDiagram: { diagram: null },
        blastDiagram: null,
        offers: {
          traceDiagram: { section: "traceDiagram", heading: "Trace Diagram", generateLabel: "Generate" },
          blastDiagram: { section: "blastDiagram", heading: "Blast Diagram", anchorId: "blast-diagram" },
          findings: { section: "findings", heading: "Findings" },
        },
      }],
    })
  })

  it("offers nothing for a configuration that switches every section on", async () => {
    const context = createContext()

    await requestWith(context, { configurationId: "standard" })

    await expect(getReview(PAGE_REQUEST, context)).resolves.toMatchObject({
      segments: [{ offers: { traceDiagram: null, blastDiagram: null, findings: null } }],
    })
  })

  it("builds the diagram at the commits of the review, switches it on and returns the prompt to paste", async () => {
    const context = createContext()
    await requestWith(context)
    await context.reviewStore.amendArtifact(KEY, (artifact) => ({ artifact: { ...artifact, status: "complete" }, outcome: null }))

    const result = await generateSection({ ...KEY, section: "traceDiagram" }, context)

    expect(result).toMatchObject({ kind: "generated", message: "Prompt copied" })
    expect(result?.kind === "generated" ? result.prompt : null).toContain("The reviewer asked for the Trace Diagram of the Flight Plan review of pull request #416 of storefront")
    const artifact = await context.reviewStore.findArtifact(KEY)
    expect(artifact).toMatchObject({
      status: "drafting",
      sections: { traceDiagram: true, blastDiagram: false, walkthrough: true, findings: false },
      segments: [{ blastDiagram: null }],
    })
    expect(artifact?.segments.flatMap((segment) => segment.traceDiagram?.traceNodes ?? []).length).toBeGreaterThan(0)
    await expect(getReview(PAGE_REQUEST, context)).resolves.toMatchObject({
      segments: [{ traceDiagram: { diagram: { nodes: [{}] } }, offers: { traceDiagram: null, blastDiagram: { section: "blastDiagram" } } }],
    })
  })

  it("keeps what is written when it generates a diagram", async () => {
    const context = createContext()
    await requestWith(context)
    const segments = (await context.reviewStore.findArtifact(KEY))?.segments ?? []
    const segmentId = segments.map((segment) => segment.id).join("")
    const waypointId = segments.flatMap(waypointsOf).map((located) => located.waypoint.id).slice(0, 1).join("")
    await updateNodes({ ...KEY, segmentId, context: "Estimates depend on the zone.", waypoints: [{ id: waypointId, reading: "Modified `estimate` condition." }] }, context)

    await generateSection({ ...KEY, section: "blastDiagram" }, context)

    const artifact = await context.reviewStore.findArtifact(KEY)
    expect(artifact?.segments).toMatchObject([{ id: segmentId, context: "Estimates depend on the zone.", traceDiagram: null }])
    expect(artifact?.segments.flatMap((segment) => segment.blastDiagram?.nodes ?? []).map((node) => node.path)).toStrictEqual([PATH])
    expect(artifact?.segments.flatMap(waypointsOf).map((located) => located.waypoint.reading).slice(0, 1)).toStrictEqual(["Modified `estimate` condition."])
  })

  it("starts the agent that wrote the review, with a prompt for the section alone", async () => {
    const spawner = new FakeSpawner()
    const context = createContext(spawner)
    await requestWith(context, { writer: AGENT_WRITER })

    const result = await generateSection({ ...KEY, section: "findings" }, context)

    expect(result).toStrictEqual({ kind: "generated", prompt: null, message: "Writing the findings" })
    const { journal } = await context.conversationEnvironment.store.read(KEY)
    const messages = journal.map((entry) => entry.event).flatMap((event) => (event.kind === "reviewer-message" ? [event.body] : []))
    expect(messages.at(-1)).toContain("report what is wrong with it as findings")
    expect(messages).toHaveLength(2)
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({
      status: "drafting",
      sections: { traceDiagram: false, blastDiagram: false, findings: true },
      segments: [{ traceDiagram: null, blastDiagram: null }],
    })
  })

  it("generates the structure alone for a Flight Plan its author writes", async () => {
    const spawner = new FakeSpawner()
    const context = createContext(spawner)
    await requestWith(context, { writer: { kind: "author", start: "scaffold" } })

    await expect(generateSection({ ...KEY, section: "traceDiagram" }, context)).resolves.toStrictEqual({
      kind: "generated",
      prompt: null,
      message: "Trace Diagram generated",
    })
    expect(spawner.launches).toStrictEqual([])
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: "authoring", sections: { traceDiagram: true } })
  })

  it("does not generate a section twice", async () => {
    const context = createContext()
    await requestWith(context)
    await generateSection({ ...KEY, section: "traceDiagram" }, context)

    await expect(generateSection({ ...KEY, section: "traceDiagram" }, context)).resolves.toStrictEqual({
      kind: "unavailable",
      message: "The Trace Diagram is already generated.",
    })
  })

  it("returns null when there is no review artifact", async () => {
    await expect(generateSection({ ...KEY, section: "traceDiagram" }, createContext())).resolves.toBeNull()
  })
})
