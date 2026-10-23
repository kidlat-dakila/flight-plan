import { mergeSegments } from "@/procedures/get-review/utils/merged-segment"
import type { Blast } from "@flightplan/configurations"
import { CART_PATH, createSegment, createWaypoint, PRICE_PATH } from "./review-fixture"

const RATES_PATH = "src/rates.ts"
const TAX_PATH = "src/tax.ts"

const blastOf = (paths: readonly string[], importBound?: Blast["importBound"]): Blast => ({
  nodes: paths.map((path) => ({ path, diffType: null, impactType: null, impactReason: null, isRequired: false })),
  edges: paths.slice(1).map((importer) => ({ importer, imported: paths[0] })),
  ...(importBound === undefined ? {} : { importBound }),
})

describe("mergeSegments", () => {
  const first = createSegment({
    id: "price",
    title: "Price",
    context: "Prices round once.",
    changedPaths: [PRICE_PATH],
    blastDiagram: blastOf([PRICE_PATH, CART_PATH]),
    walkthrough: { files: [{ path: PRICE_PATH, waypoints: [createWaypoint("price-of", "priceOf")] }] },
  })
  const second = createSegment({
    id: "cart",
    title: "Cart",
    context: "The cart sums rounded prices.",
    changedPaths: [CART_PATH, PRICE_PATH],
    blastDiagram: blastOf([PRICE_PATH, CART_PATH, RATES_PATH], { nodes: [{ path: RATES_PATH, diffType: null }], edges: [] }),
    walkthrough: {
      files: [
        { path: CART_PATH, waypoints: [createWaypoint("subtotal", "subtotal")] },
        { path: PRICE_PATH, waypoints: [createWaypoint("format", "format")] },
      ],
    },
  })

  it("keeps the first segment's id and context, and joins the changed files of every segment once", () => {
    expect(mergeSegments([first, second])).toMatchObject({
      id: "price",
      title: "",
      context: "Prices round once.",
      changedPaths: [CART_PATH, PRICE_PATH],
      traceDiagram: null,
      isContextRequired: first.isContextRequired,
    })
  })

  it("joins the hidden Blast Diagram of a segment the segmented page draws none for", () => {
    const hidden = createSegment({
      id: "rates",
      title: "Rates",
      context: "Rates load once.",
      changedPaths: [RATES_PATH],
      blastDiagram: null,
      hiddenBlastDiagram: blastOf([RATES_PATH], { nodes: [{ path: RATES_PATH, diffType: null }, { path: TAX_PATH, diffType: null }], edges: [] }),
    })

    const { blastDiagram } = mergeSegments([first, hidden])

    expect(blastDiagram?.nodes.map((node) => node.path)).toStrictEqual([PRICE_PATH, CART_PATH, RATES_PATH])
    expect(blastDiagram?.importBound?.nodes.map((node) => node.path)).toStrictEqual([RATES_PATH, TAX_PATH])
  })

  it("joins the File Sections of one path, with their waypoints in segment order", () => {
    expect(mergeSegments([first, second]).walkthrough.files.map((file) => [file.path, file.waypoints.map((waypoint) => waypoint.id)])).toStrictEqual([
      [PRICE_PATH, ["price-of", "format"]],
      [CART_PATH, ["subtotal"]],
    ])
  })

  it("keeps the joined files in their stored order only when every segment was arranged", () => {
    const arrangedOf = (segment: typeof first) => ({ ...segment, walkthrough: { ...segment.walkthrough, isArranged: true } })

    expect(mergeSegments([arrangedOf(first), arrangedOf(second)]).walkthrough.isArranged).toBe(true)
    expect(mergeSegments([arrangedOf(first), second]).walkthrough.isArranged).toBe(false)
  })

  it("joins the Blast Diagrams, each file and each import once, the first assessment of a file winning", () => {
    const merged = mergeSegments([first, second]).blastDiagram

    expect(merged?.nodes.map((node) => node.path)).toStrictEqual([PRICE_PATH, CART_PATH, RATES_PATH])
    expect(merged?.edges).toStrictEqual([{ importer: CART_PATH, imported: PRICE_PATH }, { importer: RATES_PATH, imported: PRICE_PATH }])
    expect(merged?.importBound).toStrictEqual({ nodes: [{ path: RATES_PATH, diffType: null }], edges: [] })
  })

  it("has no Blast Diagram when no segment has one", () => {
    expect(mergeSegments([{ ...first, blastDiagram: null }, { ...second, blastDiagram: null }]).blastDiagram).toBeNull()
  })
})
