import { createConversationEnvironment, createMockProcedureContext, openSampleRepository, type ProcedureContext } from "@/procedures/context"
import { SequentialIds } from "@/procedures/get-conversation/utils/__tests__/conversation-fixture"
import type { RecordedChange } from "@/procedures/get-review/utils/change-reader"
import { InMemoryReviewStore } from "@/procedures/get-review/utils/review-store"
import { EMPTY_SETUP } from "@/procedures/get-setup/utils/setup"
import { InMemorySetupStore } from "@/procedures/get-setup/utils/setup-store"
import { WALKTHROUGH_ONLY_ARTIFACT } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { createChangeRepositoryOpener } from "@/procedures/request-review/__tests__/change-repository"
import { buildArtifactAt } from "@/procedures/request-review/utils/build-artifact"
import { writeUpReview } from "@/procedures/write-up-review"
import type { WriteUpReviewInput } from "@/procedures/write-up-review/utils/schemas"
import type { RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import type { ReviewArtifact } from "@flightplan/configurations"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-416" }
const CLAUDE_SETUP = {
  ...EMPTY_SETUP,
  agents: { installs: [{ agent: "claude", installPath: "/home/.claude", model: "opus", effort: "max" }], defaultAgent: "claude" },
} as const

const UNREQUIRED_ARTIFACT: ReviewArtifact = {
  ...WALKTHROUGH_ONLY_ARTIFACT,
  status: "complete",
  segments: WALKTHROUGH_ONLY_ARTIFACT.segments.map((segment) => ({
    ...segment,
    isContextRequired: false,
    walkthrough: { files: segment.walkthrough.files.map((file) => ({ ...file, waypoints: file.waypoints.map((waypoint) => ({ ...waypoint, isRequired: false })) })) },
  })),
}

const INPUT: WriteUpReviewInput = {
  ...KEY,
  sections: ["walkthrough", "findings"],
  configurationId: "minimal",
  walkthroughOrder: "important-first",
  isSegmented: false,
}

const createWritingContext = async (artifact: ReviewArtifact = UNREQUIRED_ARTIFACT, baseCommit = "0000000"): Promise<ProcedureContext> => {
  const reviewStore = new InMemoryReviewStore([])
  await reviewStore.writeScaffold(KEY, {
    artifact,
    baseCommit,
    request: { configurationId: "standard", preset: "standard", order: "foundations-first", customOrder: null, writer: { kind: "none" }, requestedAt: NOW },
  })
  return {
    ...createMockProcedureContext(NOW),
    reviewStore,
    setupStore: new InMemorySetupStore(CLAUDE_SETUP),
    conversationEnvironment: createConversationEnvironment({ newId: new SequentialIds().next }),
    now: () => NOW,
  }
}

const lastRequestOf = async (context: ProcedureContext): Promise<string> => {
  const { journal } = await context.conversationEnvironment.store.read(KEY)
  const event = journal.at(-1)?.event
  return event?.kind === "reviewer-message" ? event.body : ""
}

describe("writeUpReview", () => {
  it("requires the chosen sections, keeps the choice with the review and leaves the request for the setup's agent", async () => {
    const context = await createWritingContext()

    await expect(writeUpReview(INPUT, context)).resolves.toStrictEqual({ kind: "started", prompt: null, message: "Sent to Claude" })

    const artifact = await context.reviewStore.findArtifact(KEY)
    expect(artifact).toMatchObject({ status: "drafting", isSegmented: false })
    expect(artifact?.segments.flatMap(waypointsOf).every(({ waypoint }) => waypoint.isRequired)).toBe(true)
    expect(artifact?.segments.every((segment) => !segment.isContextRequired)).toBe(true)
    await expect(context.reviewStore.findRequest(KEY)).resolves.toMatchObject({
      configurationId: "minimal",
      preset: "minimal",
      writer: { kind: "agent", agent: "claude", model: "opus", effort: "max" },
      writeUp: { sections: ["walkthrough", "findings"], walkthroughOrder: "important-first" },
    })
    await expect(lastRequestOf(context)).resolves.toContain("Write up the parts of the Code Walkthrough that Flight Plan marked as required, and nothing else.")
    await expect(lastRequestOf(context)).resolves.toContain("Check the code of every waypoint for findings.")
  })

  it("tells the agent to write no findings when the reviewer did not choose them", async () => {
    const context = await createWritingContext()

    await writeUpReview({ ...INPUT, sections: ["context"] }, context)

    await expect(lastRequestOf(context)).resolves.toContain("Write no findings: the reviewer did not ask for them.")
  })

  it("refuses an empty choice, a configuration that does not exist and a review with no agent set up", async () => {
    const context = await createWritingContext()

    await expect(writeUpReview({ ...INPUT, sections: [] }, context)).resolves.toMatchObject({ kind: "rejected", field: "sections" })
    await expect(writeUpReview({ ...INPUT, configurationId: "custom-gone" }, context)).resolves.toMatchObject({ kind: "rejected", field: "configuration" })
    await expect(writeUpReview(INPUT, { ...context, setupStore: new InMemorySetupStore(EMPTY_SETUP) })).resolves.toMatchObject({ kind: "rejected", field: "agent" })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toMatchObject({ status: "complete" })
  })

  it("asks the agent for nothing when everything chosen is already written", async () => {
    const written = { ...UNREQUIRED_ARTIFACT, segments: UNREQUIRED_ARTIFACT.segments.map((segment) => ({ ...segment, context: "This segment rounds once.", title: "Rounding" })) }
    const context = await createWritingContext(written)

    await expect(writeUpReview({ ...INPUT, sections: ["context"] }, context)).resolves.toStrictEqual({ kind: "written", message: "Everything you chose is already explained." })
    await expect(context.conversationEnvironment.store.read(KEY)).resolves.toMatchObject({ journal: [] })
  })
})

const FORMAT_PATH = "src/format.ts"
const PAGE_PATHS = ["src/pageA.ts", "src/pageB.ts"] as const
const MAIN_PATH = "src/main.ts"
const MAIN_TEXT = "import { pageA } from \"./pageA\"\nimport { pageB } from \"./pageB\"\npageA()\npageB()\n"

const pageTextOf = (name: string, mark: string): string => `import { format } from "./format"\nexport const ${name} = () => format("${mark}")\n`

const modifiedDiffOf = (path: string, line: number, removed: string, added: string): string =>
  [`diff --git a/${path} b/${path}`, `--- a/${path}`, `+++ b/${path}`, `@@ -${String(line)} +${String(line)} @@`, `-${removed}`, `+${added}`].join("\n")

const FORMAT_CHANGE: RecordedChange = {
  repositoryPath: "/Users/dev/projects/storefront",
  branchName: "feature/trimmed-labels",
  revision: { headCommit: "1111111aaaaaaa", baseCommit: "0000000bbbbbbb" },
  diff: [
    modifiedDiffOf(FORMAT_PATH, 1, "export const format = (text) => text", "export const format = (text) => text.trim()"),
    modifiedDiffOf(PAGE_PATHS[0], 2, "export const pageA = () => format(\"a\")", "export const pageA = () => format(\"A\")"),
    modifiedDiffOf(PAGE_PATHS[1], 2, "export const pageB = () => format(\"b\")", "export const pageB = () => format(\"B\")"),
  ].join("\n"),
  changedPaths: [FORMAT_PATH, ...PAGE_PATHS],
  texts: {
    [MAIN_PATH]: MAIN_TEXT,
    [FORMAT_PATH]: "export const format = (text) => text.trim()\n",
    [PAGE_PATHS[0]]: pageTextOf("pageA", "A"),
    [PAGE_PATHS[1]]: pageTextOf("pageB", "B"),
  },
}

const FORMAT_BASE_TEXTS = {
  [MAIN_PATH]: MAIN_TEXT,
  [FORMAT_PATH]: "export const format = (text) => text\n",
  [PAGE_PATHS[0]]: pageTextOf("pageA", "a"),
  [PAGE_PATHS[1]]: pageTextOf("pageB", "b"),
}

const formatOpener = createChangeRepositoryOpener([{ change: FORMAT_CHANGE, baseTexts: FORMAT_BASE_TEXTS }])

const segmentedFormatArtifactOf = async (): Promise<ReviewArtifact> => {
  const opened = await formatOpener(FORMAT_CHANGE.repositoryPath, EMPTY_SETUP.forges)
  const building = await buildArtifactAt(opened.resolved, {
    ...FORMAT_CHANGE.revision,
    title: "Trimmed labels",
    newId: new SequentialIds().next,
    ignoredPaths: [],
    isSegmented: true,
  })
  if (building.kind === "unavailable") throw new Error(building.message)
  return { ...building.artifact, status: "complete" }
}

const traceNamesOf = (artifact: ReviewArtifact | null): (string[] | null)[] =>
  artifact?.segments.map((segment) => segment.traceDiagram?.traceNodes.map((node) => node.codeBlocks[0].name ?? node.type) ?? null) ?? []

const createSegmentingContext = async (artifact: ReviewArtifact, openRepository: RepositoryAdapterOpener): Promise<ProcedureContext> => {
  const context = await createWritingContext(artifact, FORMAT_CHANGE.revision.baseCommit)
  return { ...context, openRepository }
}

describe("writeUpReview with another segments choice than the review's", () => {
  it("rebuilds the review at its commits, so with segments off the shared files are drawn only in the traces of the lines that reach them", async () => {
    const artifact = await segmentedFormatArtifactOf()
    const context = await createSegmentingContext(artifact, formatOpener)

    await writeUpReview({ ...INPUT, sections: ["traceDiagram"], isSegmented: false }, context)

    const rebuilt = await context.reviewStore.findArtifact(KEY)
    expect(traceNamesOf(artifact)).toStrictEqual([null, ["pageA", "format"], ["pageB", "format"]])
    expect(rebuilt?.isSegmented).toBe(false)
    expect(traceNamesOf(rebuilt)).toStrictEqual([null, ["pageA", "format"], ["pageB", "format"]])
  })

  it("keeps the diagrams it has when the repository cannot be read", async () => {
    const artifact = await segmentedFormatArtifactOf()
    const context = await createSegmentingContext(artifact, openSampleRepository)

    await writeUpReview({ ...INPUT, sections: ["traceDiagram"], isSegmented: false }, context)

    const kept = await context.reviewStore.findArtifact(KEY)
    expect(kept?.isSegmented).toBe(false)
    expect(traceNamesOf(kept)).toStrictEqual(traceNamesOf(artifact))
  })
})
