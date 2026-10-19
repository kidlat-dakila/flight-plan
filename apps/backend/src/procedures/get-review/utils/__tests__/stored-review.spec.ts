import { parse, stringify } from "devalue"
import { HELD_STOCK_ARTIFACT } from "@/procedures/get-review/utils/mocks/held-stock"
import { formatStoredReview, parseStoredReview, type ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { reviewArtifactSchema, type ReviewArtifact, type TraceDiagram } from "@flightplan/configurations"

const SCAFFOLD: ReviewScaffold = {
  artifact: HELD_STOCK_ARTIFACT,
  baseCommit: "0000000",
  request: {
    configurationId: "onboardee",
    preset: "onboardee",
    order: "custom",
    customOrder: "Tests first.",
    writer: { kind: "agent", agent: "claude", model: "opus", effort: "high" },
    requestedAt: new Date("2026-10-01T12:00:00.000Z"),
  },
}

const asJourney = ({ traceNodes, traceNodeEdges, ...diagram }: TraceDiagram) => ({
  ...diagram,
  journeyNodes: traceNodes,
  journeyNodeEdges: traceNodeEdges,
})

const REQUIREMENT_KEYS: readonly string[] = ["isRequired", "isContextRequired"]

const withRequirement = (value: unknown, isRequired: boolean): unknown => {
  if (Array.isArray(value)) return value.map((item: unknown) => withRequirement(item, isRequired))
  if (typeof value !== "object" || value === null) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => [key, REQUIREMENT_KEYS.includes(key) ? isRequired : withRequirement(field, isRequired)]),
  )
}

const withEveryRequirement = (artifact: ReviewArtifact, isRequired: boolean): ReviewArtifact =>
  reviewArtifactSchema.parse(withRequirement(artifact, isRequired))

const BLOCK_LABELS_AFTER_A_FIELD = /,"blockLabels":\d+/g
const BLOCK_LABELS_BEFORE_A_FIELD = /"blockLabels":\d+,/g

describe("stored review", () => {
  it("reads back the artifact, the base commit and the reviewer's choices it wrote", () => {
    expect(parseStoredReview(formatStoredReview(SCAFFOLD))).toStrictEqual(SCAFFOLD)
  })

  it("writes the format version, the kind and the choices in the meta block", () => {
    expect(parse(formatStoredReview(SCAFFOLD))).toMatchObject({
      schema: 4,
      meta: {
        kind: "review",
        baseCommit: "0000000",
        request: { configurationId: "onboardee", preset: "onboardee", order: "custom", requestedAt: "2026-10-01T12:00:00.000Z" },
      },
      artifact: { title: HELD_STOCK_ARTIFACT.title, status: "complete" },
    })
  })

  it("keeps a block that two nodes hold as one block, and the code group of two segments as one group", () => {
    const read = parseStoredReview(formatStoredReview(SCAFFOLD))
    const [traceDiagram] = (read?.artifact.segments ?? []).flatMap((segment) => (segment.traceDiagram === null ? [] : [segment.traceDiagram]))
    const [node] = traceDiagram.traceNodes

    expect(traceDiagram.astCodeGroup.codeBlocks).toContain(node.codeBlocks[0])
    expect(node.diffCodeBlocks.every((block) => node.codeBlocks.includes(block))).toBe(true)
  })

  it("reads a review saved before a node had block labels, with none on each node", () => {
    const older = formatStoredReview(SCAFFOLD).replaceAll(BLOCK_LABELS_AFTER_A_FIELD, "").replaceAll(BLOCK_LABELS_BEFORE_A_FIELD, "")

    expect(older).not.toContain("blockLabels")
    expect(parseStoredReview(older)).toStrictEqual(SCAFFOLD)
  })

  it("reads a review saved while the walkthrough had an intro and files had a title and a summary, without them", () => {
    const olderArtifact = {
      ...HELD_STOCK_ARTIFACT,
      segments: HELD_STOCK_ARTIFACT.segments.map((segment) => ({
        ...segment,
        walkthrough: { intro: "The stock check first.", files: segment.walkthrough.files.map((file) => ({ ...file, title: "Held units", summary: ["Subtracts held units."] })) },
      })),
    }
    const older = formatStoredReview({ ...SCAFFOLD, artifact: olderArtifact })

    expect(older).toContain("Subtracts held units.")
    expect(parseStoredReview(older)).toStrictEqual(SCAFFOLD)
  })

  it("reads a review saved while the diagrams were named journey and blast, under their current names", () => {
    const olderArtifact = {
      ...HELD_STOCK_ARTIFACT,
      sections: { journey: true, blast: true, walkthrough: true, findings: true },
      segments: HELD_STOCK_ARTIFACT.segments.map(({ traceDiagram, blastDiagram, ...segment }) => ({
        ...segment,
        journey: traceDiagram === null ? null : asJourney(traceDiagram),
        blast: blastDiagram,
      })),
    }
    const older = stringify({ ...parse(formatStoredReview(SCAFFOLD)), schema: 2, artifact: olderArtifact })

    expect(parseStoredReview(older)).toStrictEqual({
      ...SCAFFOLD,
      artifact: { ...HELD_STOCK_ARTIFACT, sections: { traceDiagram: true, blastDiagram: true, walkthrough: true, findings: true } },
    })
  })

  it("reads a review saved before nodes were required, with every node of its sections required when an agent writes it", () => {
    const nothingRequired = withEveryRequirement(HELD_STOCK_ARTIFACT, false)
    const older = stringify({ ...parse(formatStoredReview({ ...SCAFFOLD, artifact: nothingRequired })), schema: 3 })

    expect(parseStoredReview(older)?.artifact).toStrictEqual(withEveryRequirement(HELD_STOCK_ARTIFACT, true))
  })

  it("reads a review saved before nodes were required, with nothing required when no agent writes it", () => {
    const nothingRequired = withEveryRequirement(HELD_STOCK_ARTIFACT, false)
    const authored = { ...SCAFFOLD, artifact: nothingRequired, request: { ...SCAFFOLD.request, writer: { kind: "none" as const } } }
    const older = stringify({ ...parse(formatStoredReview(authored)), schema: 3 })

    expect(parseStoredReview(older)?.artifact).toStrictEqual(nothingRequired)
  })

  it("reads the needs-attention note of a review saved before it was named the core change as its core change", () => {
    const older = formatStoredReview(SCAFFOLD).replaceAll("\"coreChange\"", "\"needsAttention\"").replace("\"schema\":4", "\"schema\":3")

    expect(older).toContain("\"needsAttention\"")
    expect(parseStoredReview(older)?.artifact).toStrictEqual(HELD_STOCK_ARTIFACT)
  })

  it("has no answer for text that is not a stored review", () => {
    expect(parseStoredReview("not json")).toBeNull()
    expect(parseStoredReview("[{\"schema\":1},3]")).toBeNull()
    expect(parseStoredReview(formatStoredReview(SCAFFOLD).replace("\"onboardee\"", "\"unknown\""))).toBeNull()
  })
})
