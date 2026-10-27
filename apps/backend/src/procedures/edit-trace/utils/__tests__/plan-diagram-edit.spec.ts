import { planDiagramEdit, type PlannedDiagramEdit } from "@/procedures/edit-trace/utils/plan-diagram-edit"
import { createMockReviews } from "@/procedures/get-review/utils/mocks/review-artifacts"
import { formatStoredReview, parseStoredReview, type ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import { listTraceNodes } from "@flightplan/codegraph"
import type { TraceNode, ReviewArtifact } from "@flightplan/configurations"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const SEGMENT_ID = "stock-check"
const PATH = "src/pages/CartPage.tsx"
const TEXT = [
  "const CartLine = ({ name }: { name: string }) => <li>{name}</li>",
  "",
  "export const CartPage = ({ names }: { names: string[] }) => (",
  "  <ul onClick={() => { console.log(names) }}>",
  "    {names.map((name) => <CartLine key={name} name={name} />)}",
  "  </ul>",
  ")",
  "",
].join("\n")
const PAGE_BLOCK_ID = `${PATH}#component@3:1`

const sampleArtifact = (): ReviewArtifact => {
  const artifact = createMockReviews().find((review) => review.key.targetId === "pr-412")?.artifact
  if (artifact === null || artifact === undefined) throw new Error("The sample Flight Plan is missing.")
  return artifact
}

const scaffoldOf = (artifact: ReviewArtifact): ReviewScaffold => ({
  artifact,
  baseCommit: "base",
  request: { configurationId: "standard", preset: "standard", order: "custom", customOrder: "Tests first.", writer: { kind: "author", start: "scaffold" }, requestedAt: NOW },
})

const addPage = (artifact: ReviewArtifact, hasChildComponents: boolean): PlannedDiagramEdit =>
  planDiagramEdit(
    artifact,
    SEGMENT_ID,
    { kind: "add-card", path: PATH, source: { kind: "block", blockId: PAGE_BLOCK_ID }, isPrefilled: true, hasChildComponents },
    TEXT,
  )

const artifactOf = (planned: PlannedDiagramEdit): ReviewArtifact => {
  if (planned.kind !== "planned") throw new Error(planned.message)
  return planned.artifact
}

const cardsOf = (artifact: ReviewArtifact | undefined): readonly TraceNode[] =>
  artifact?.segments.find((candidate) => candidate.id === SEGMENT_ID)?.traceDiagram?.traceNodes ?? []

const lastOf = (cards: readonly TraceNode[]): TraceNode => cards[cards.length - 1]

describe("planDiagramEdit", () => {
  it("adds a card of a file the Flight Plan does not hold, and holds the file from then on", () => {
    const artifact = sampleArtifact()
    const planned = addPage(artifact, false)
    const { sources } = artifactOf(planned)

    expect(planned).toMatchObject({ kind: "planned", nodeId: PAGE_BLOCK_ID })
    expect(sources[sources.length - 1]).toMatchObject({ path: PATH, language: "tsx" })
    expect(sources).toHaveLength(artifact.sources.length + 1)
  })

  it("puts the components a component renders inside its card when asked", () => {
    const cards = cardsOf(artifactOf(addPage(sampleArtifact(), true)))
    const card = lastOf(cards)

    expect(card.children.map((child) => child.codeBlocks[0].name)).toStrictEqual(["CartLine"])
    expect(listTraceNodes(cards).map((node) => node.id)).toContain(card.children[0].id)
  })

  it("refuses a file that could not be read", () => {
    expect(
      planDiagramEdit(sampleArtifact(), SEGMENT_ID, { kind: "add-card", path: PATH, source: { kind: "lines", lineStart: 1, lineEnd: 2 }, isPrefilled: false, hasChildComponents: false }, null),
    ).toMatchObject({ kind: "rejected" })
  })

  it("refuses a line that joins a card to a card inside it", () => {
    const artifact = artifactOf(addPage(sampleArtifact(), true))
    const card = lastOf(cardsOf(artifact))
    const [row] = card.rows ?? []

    expect(
      planDiagramEdit(artifact, SEGMENT_ID, { kind: "add-line", from: card.id, fromRowId: row.id, to: card.children[0].id, toSide: "left" }, null),
    ).toStrictEqual({ kind: "rejected", message: "A line cannot join a card to a card inside it." })
  })

  it("refuses a description that links to code the Flight Plan does not hold", () => {
    expect(
      planDiagramEdit(sampleArtifact(), SEGMENT_ID, { kind: "change-card", nodeId: "checkout", label: "", description: "See [`gone()`](code:src/gone.ts#gone).", rows: [] }, null),
    ).toMatchObject({ kind: "rejected" })
  })

  it("writes the title and the description of the diagram, trimmed, and leaves its cards and lines as they are", () => {
    const artifact = sampleArtifact()
    const traceDiagram = artifact.segments.find((segment) => segment.id === SEGMENT_ID)?.traceDiagram

    const planned = planDiagramEdit(artifact, SEGMENT_ID, { kind: "describe", title: " Reserve stock flow diagram ", description: "  Two endpoints run the stock guard.\n" }, null)

    expect(planned.kind === "planned" ? planned.artifact.segments.find((segment) => segment.id === SEGMENT_ID)?.traceDiagram : null).toStrictEqual({
      ...traceDiagram,
      title: "Reserve stock flow diagram",
      description: "Two endpoints run the stock guard.",
    })
  })

  it("refuses an empty title or description of the diagram, and a description that links to code the Flight Plan does not hold", () => {
    const artifact = sampleArtifact()

    expect(planDiagramEdit(artifact, SEGMENT_ID, { kind: "describe", title: " ", description: "Two endpoints run the stock guard." }, null)).toStrictEqual({
      kind: "rejected",
      message: "Write the title. It names the flow the diagram shows.",
    })

    expect(planDiagramEdit(artifact, SEGMENT_ID, { kind: "describe", title: "Reserve stock flow diagram", description: "  " }, null)).toStrictEqual({
      kind: "rejected",
      message: "Write the description. It tells the diagram in words.",
    })
    expect(planDiagramEdit(artifact, SEGMENT_ID, { kind: "describe", title: "Reserve stock flow diagram", description: "See [`total()`](code:src/nowhere.ts#total)." }, null)).toMatchObject({ kind: "rejected" })
  })

  it("stores the width a top-level card is dragged to, and keeps it after the diagram is written to a file and read back", () => {
    const artifact = artifactOf(addPage(sampleArtifact(), true))
    const cards = cardsOf(artifact)

    const resized = artifactOf(planDiagramEdit(artifact, SEGMENT_ID, { kind: "resize-card", nodeId: PAGE_BLOCK_ID, width: 420 }, null))

    expect(cardsOf(resized)).toStrictEqual(cards.map((card) => (card.id === PAGE_BLOCK_ID ? { ...card, width: 420 } : card)))
    expect(cardsOf(parseStoredReview(formatStoredReview(scaffoldOf(resized), null))?.artifact).find((card) => card.id === PAGE_BLOCK_ID)).toMatchObject({ width: 420 })
  })

  it("refuses to resize a card that is not on the diagram, or a card inside another card", () => {
    const artifact = artifactOf(addPage(sampleArtifact(), true))
    const card = lastOf(cardsOf(artifact))

    expect(planDiagramEdit(artifact, SEGMENT_ID, { kind: "resize-card", nodeId: "gone", width: 420 }, null)).toStrictEqual({
      kind: "rejected",
      message: "This card is no longer on the diagram.",
    })
    expect(planDiagramEdit(artifact, SEGMENT_ID, { kind: "resize-card", nodeId: card.children[0].id, width: 420 }, null)).toStrictEqual({
      kind: "rejected",
      message: "A card inside another card moves with the card around it.",
    })
  })

  it("keeps an edited diagram readable after it is written to a file and read back", () => {
    const withPage = artifactOf(addPage(sampleArtifact(), true))
    const withLines = artifactOf(planDiagramEdit(withPage, SEGMENT_ID, { kind: "add-card", path: PATH, source: { kind: "lines", lineStart: 4, lineEnd: 6 }, isPrefilled: true, hasChildComponents: false }, TEXT))
    const moved = artifactOf(planDiagramEdit(withLines, SEGMENT_ID, { kind: "move-cards", places: [{ nodeId: PAGE_BLOCK_ID, x: 40, y: 60 }] }, null))

    const cards = cardsOf(parseStoredReview(formatStoredReview(scaffoldOf(moved), null))?.artifact)

    expect(cards.find((card) => card.id === PAGE_BLOCK_ID)).toMatchObject({ position: { x: 40, y: 60 }, children: [{ type: "component" }] })
    expect(lastOf(cards).codeBlocks[0]).toMatchObject({ name: "Lines 4 to 6" })
    expect(lastOf(cards).codeBlocks[0].astGraph.filePath).toBe(PATH)
  })
})
