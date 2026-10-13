import { createMockProcedureContext, type ProcedureContext } from "@/procedures/context"
import { editJourney } from "@/procedures/edit-journey"
import type { DiagramEdit } from "@/procedures/edit-journey/utils/schemas"
import { getCardForm } from "@/procedures/get-card-form"
import { getReview } from "@/procedures/get-review"
import { listJourneyNodes } from "@flightplan/codegraph"

const NOW = new Date("2026-10-01T12:00:00.000Z")
const KEY = { repositoryName: "storefront", targetId: "pr-412" }
const SEGMENT_ID = "stock-check"
const STOCK_LEVEL_PATH = "src/inventory/stock-level.ts"
const ERROR_BLOCK_ID = `${STOCK_LEVEL_PATH}#class@5:1`
const ROW = { id: null, type: "condition", label: "Refuses an empty cart", lineStart: 6, lineEnd: 8 } as const

const createContext = (): ProcedureContext => ({ ...createMockProcedureContext(NOW), now: () => NOW })

const edit = async (context: ProcedureContext, diagramEdit: DiagramEdit) =>
  await editJourney({ ...KEY, segmentId: SEGMENT_ID, edit: diagramEdit }, context)

const readJourney = async (context: ProcedureContext) => {
  const artifact = await context.reviewStore.findArtifact(KEY)
  const segment = artifact?.segments.find((candidate) => candidate.id === SEGMENT_ID)
  if (artifact === null || segment === undefined) throw new Error("The sample Flight Plan is missing.")
  return { artifact, journey: segment.journey }
}

const readDiagram = async (context: ProcedureContext) => {
  const page = await getReview({ ...KEY, filterKeys: null, isShowingReviewed: false }, context)
  const segment = page?.kind === "artifact" ? page.segments.find((candidate) => candidate.id === SEGMENT_ID) : undefined
  return segment?.journey.diagram ?? null
}

const cardIdsOf = async (context: ProcedureContext): Promise<string[]> =>
  listJourneyNodes((await readJourney(context)).journey?.journeyNodes ?? []).map((node) => node.id)

describe("editJourney", () => {
  it("removes the whole diagram and adds an empty one back, without changing the status of the artifact", async () => {
    const context = createContext()
    const before = await readJourney(context)

    await expect(edit(context, { kind: "add-diagram" })).resolves.toMatchObject({ kind: "rejected" })
    await expect(edit(context, { kind: "remove-diagram" })).resolves.toStrictEqual({ kind: "saved", nodeId: null })
    await expect(readDiagram(context)).resolves.toBeNull()
    await expect(edit(context, { kind: "remove-diagram" })).resolves.toMatchObject({ kind: "rejected" })
    await expect(edit(context, { kind: "add-diagram" })).resolves.toStrictEqual({ kind: "saved", nodeId: null })
    await expect(readDiagram(context)).resolves.toMatchObject({ nodes: [], edges: [] })
    expect((await readJourney(context)).artifact.status).toBe(before.artifact.status)
  })

  it("clears the diagram of every card and every line, and keeps the empty diagram", async () => {
    const context = createContext()

    await expect(edit(context, { kind: "clear-diagram" })).resolves.toStrictEqual({ kind: "saved", nodeId: null })
    await expect(readDiagram(context)).resolves.toMatchObject({ nodes: [], edges: [] })
    await expect(edit(context, { kind: "remove-diagram" })).resolves.toStrictEqual({ kind: "saved", nodeId: null })
    await expect(edit(context, { kind: "clear-diagram" })).resolves.toMatchObject({ kind: "rejected" })
  })

  it("stores the position of a dragged card, and the page returns it", async () => {
    const context = createContext()

    await expect(edit(context, { kind: "move-cards", places: [{ nodeId: "checkout", x: 320.4, y: 48.6 }] })).resolves.toMatchObject({ kind: "saved" })

    const diagram = await readDiagram(context)

    expect(diagram?.nodes.find((node) => node.id === "checkout")?.position).toStrictEqual({ x: 320, y: 49 })
    expect(diagram?.nodes.find((node) => node.id === "post-checkout")?.position).toBeNull()
    await expect(edit(context, { kind: "move-cards", places: [{ nodeId: "gone", x: 0, y: 0 }] })).resolves.toMatchObject({ kind: "rejected" })
  })

  it("saves the label, the description and the rows of a card, ordered by their first line", async () => {
    const context = createContext()
    const later = { ...ROW, label: "", lineStart: 10, lineEnd: 11 }

    await expect(
      edit(context, { kind: "change-card", nodeId: "post-checkout", label: " Checkout route ", description: "Reads the cart.", rows: [later, ROW] }),
    ).resolves.toStrictEqual({ kind: "saved", nodeId: "post-checkout" })

    const form = await getCardForm({ ...KEY, segmentId: SEGMENT_ID, nodeId: "post-checkout" }, context)

    expect(form).toMatchObject({ label: "Checkout route", description: "Reads the cart." })
    expect(form?.rows.map(({ type, label, name, lineStart }) => ({ type, label, name, lineStart }))).toStrictEqual([
      { type: "condition", label: "Refuses an empty cart", name: "Lines 6 to 8", lineStart: 6 },
      { type: "condition", label: "", name: "Lines 10 to 11", lineStart: 10 },
    ])

    const card = (await readDiagram(context))?.nodes.find((node) => node.id === "post-checkout")

    expect(card?.triggerLabels.map(({ label, typeLabel, isDraft }) => ({ label, typeLabel, isDraft }))).toStrictEqual([
      { label: "Refuses an empty cart", typeLabel: "Condition", isDraft: false },
      { label: "Lines 10 to 11", typeLabel: "Condition", isDraft: true },
    ])
    expect(card?.rowGroups).toStrictEqual([{ label: null, rowIds: form?.rows.map((row) => row.id) }])
  })

  it("draws a line from a row to a side of another card, and takes it away with its row", async () => {
    const context = createContext()
    await edit(context, { kind: "change-card", nodeId: "post-checkout", label: "", description: "", rows: [ROW] })
    const [row] = (await getCardForm({ ...KEY, segmentId: SEGMENT_ID, nodeId: "post-checkout" }, context))?.rows ?? []
    const line = { kind: "add-line", from: "post-checkout", fromRowId: row.id, to: "stock-badge", toSide: "top" } as const

    await expect(edit(context, line)).resolves.toMatchObject({ kind: "saved" })
    await expect(edit(context, line)).resolves.toMatchObject({ kind: "rejected" })
    await expect(edit(context, { ...line, to: "post-checkout" })).resolves.toMatchObject({ kind: "rejected" })
    await expect(edit(context, { ...line, fromRowId: "gone" })).resolves.toMatchObject({ kind: "rejected" })

    const drawn = (await readDiagram(context))?.edges.find((edge) => edge.to === "stock-badge" && edge.from === "post-checkout")

    expect(drawn).toMatchObject({ fromRowId: row.id, toRowId: null, toSide: "top" })

    await edit(context, { kind: "change-card", nodeId: "post-checkout", label: "", description: "", rows: [] })

    expect((await readJourney(context)).journey?.journeyNodeEdges.some((edge) => edge.from === "post-checkout" && edge.to === "stock-badge")).toBe(false)
  })

  it("removes a line the codegraph drew by the two cards it joins", async () => {
    const context = createContext()

    await expect(edit(context, { kind: "remove-line", edgeId: "a row -> checkout", from: "post-checkout", to: "checkout" })).resolves.toMatchObject({ kind: "saved" })
    expect((await readJourney(context)).journey?.journeyNodeEdges.some((edge) => edge.id === "post-checkout -> checkout")).toBe(false)
    await expect(edit(context, { kind: "remove-line", edgeId: "gone", from: "post-checkout", to: "checkout" })).resolves.toMatchObject({ kind: "rejected" })
  })

  it("deletes a card with the cards it points to, and keeps the cards that point to it", async () => {
    const context = createContext()

    await expect(edit(context, { kind: "remove-card", nodeId: "assert-in-stock" })).resolves.toMatchObject({ kind: "saved" })

    const cardIds = await cardIdsOf(context)

    expect(cardIds).toStrictEqual(["post-checkout", "checkout", "add-to-cart-route", "use-stock-level", "get-stock", "release-holds-job", "release-expired-holds"])
    expect((await readJourney(context)).journey?.journeyNodeEdges.map((edge) => edge.id)).toStrictEqual([
      "post-checkout -> checkout",
      "use-stock-level -> get-stock",
      "release-holds-job -> release-expired-holds",
    ])
  })

  it("adds a card of a code block of a file, and refuses the same block twice", async () => {
    const context = createContext()
    const card = { kind: "add-card", path: STOCK_LEVEL_PATH, source: { kind: "block", blockId: ERROR_BLOCK_ID }, isPrefilled: true, hasChildComponents: false } as const

    await expect(edit(context, card)).resolves.toStrictEqual({ kind: "saved", nodeId: ERROR_BLOCK_ID })
    await expect(edit(context, card)).resolves.toMatchObject({ kind: "rejected" })

    const added = (await readDiagram(context))?.nodes.find((node) => node.id === ERROR_BLOCK_ID)

    expect(added).toMatchObject({ name: "OutOfStockError", typeLabel: "Class", shortPath: "src/inventory/stock-level.ts" })
    await expect(getCardForm({ ...KEY, segmentId: SEGMENT_ID, nodeId: ERROR_BLOCK_ID }, context)).resolves.toMatchObject({ path: STOCK_LEVEL_PATH, lineStart: 5, lineEnd: 9 })
  })

  it("adds a card at the end of a line drawn onto the empty board, where the line was dropped", async () => {
    const context = createContext()
    await edit(context, { kind: "change-card", nodeId: "post-checkout", label: "", description: "", rows: [ROW] })
    const [row] = (await getCardForm({ ...KEY, segmentId: SEGMENT_ID, nodeId: "post-checkout" }, context))?.rows ?? []
    const card = { kind: "add-card", path: STOCK_LEVEL_PATH, source: { kind: "block", blockId: ERROR_BLOCK_ID }, isPrefilled: false, hasChildComponents: false } as const
    const lineEnd = { from: "post-checkout", fromRowId: row.id, position: { x: 900.4, y: 120 }, places: [{ nodeId: "checkout", x: 300, y: 40 }] }

    await expect(edit(context, { ...card, lineEnd: { ...lineEnd, fromRowId: "gone" } })).resolves.toMatchObject({ kind: "rejected" })
    await expect(edit(context, { ...card, lineEnd })).resolves.toStrictEqual({ kind: "saved", nodeId: ERROR_BLOCK_ID })

    const diagram = await readDiagram(context)

    expect(diagram?.nodes.find((node) => node.id === ERROR_BLOCK_ID)?.position).toStrictEqual({ x: 900, y: 120 })
    expect(diagram?.nodes.find((node) => node.id === "checkout")?.position).toStrictEqual({ x: 300, y: 40 })
    expect(diagram?.edges.find((edge) => edge.to === ERROR_BLOCK_ID)).toMatchObject({ from: "post-checkout", fromRowId: row.id, toSide: "left" })
  })

  it("adds a card of a line range, and refuses lines the file does not have", async () => {
    const context = createContext()
    const card = { kind: "add-card", path: STOCK_LEVEL_PATH, source: { kind: "lines", lineStart: 12, lineEnd: 14 }, isPrefilled: false, hasChildComponents: false } as const

    await expect(edit(context, card)).resolves.toStrictEqual({ kind: "saved", nodeId: `${STOCK_LEVEL_PATH}#lines@12:14` })
    await expect(edit(context, { ...card, source: { kind: "lines", lineStart: 12, lineEnd: 400 } })).resolves.toMatchObject({ kind: "rejected" })
    await expect(edit(context, { ...card, path: "src/missing.ts" })).resolves.toMatchObject({ kind: "rejected" })
    expect((await readDiagram(context))?.nodes.at(-1)).toMatchObject({ name: "Lines 12 to 14", typeLabel: "Function" })
  })

  it("returns why an edit was not saved and leaves the artifact as it was", async () => {
    const context = createContext()
    const before = await context.reviewStore.findArtifact(KEY)

    await expect(edit(context, { kind: "remove-card", nodeId: "gone" })).resolves.toStrictEqual({ kind: "rejected", message: "This card is no longer on the diagram." })
    await expect(editJourney({ ...KEY, segmentId: "gone", edit: { kind: "remove-diagram" } }, context)).resolves.toMatchObject({ kind: "rejected" })
    await expect(context.reviewStore.findArtifact(KEY)).resolves.toStrictEqual(before)
  })

  it("reports nothing for a review target that has no Flight Plan", async () => {
    await expect(editJourney({ ...KEY, targetId: "pr-416", segmentId: SEGMENT_ID, edit: { kind: "remove-diagram" } }, createContext())).resolves.toBeNull()
  })
})
