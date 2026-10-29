import { carryWriting } from "@/procedures/get-review/utils/carry-writing"
import { mockTrace } from "@/procedures/get-review/utils/mocks/mock-trace"
import type { ReviewArtifact } from "@flightplan/configurations"
import { cartSource, createArtifact, createSegment, PRICE_PATH, priceSource } from "./review-fixture"

const segment = createSegment({ id: "flat" })
const rebuilt = createArtifact({ segments: [segment] })
const arranged: ReviewArtifact = {
  ...rebuilt,
  segments: [{ ...segment, walkthrough: { files: [...segment.walkthrough.files].reverse(), isArranged: true } }],
}

const walkthroughOf = (artifact: ReviewArtifact) => artifact.segments[0].walkthrough

describe("carryWriting", () => {
  it("keeps the order an author arranged on a segment whose code did not change", () => {
    const carried = walkthroughOf(carryWriting(arranged, rebuilt, "written"))

    expect(carried.files.map((file) => file.path)).toStrictEqual(walkthroughOf(arranged).files.map((file) => file.path))
    expect(carried.isArranged).toBe(true)
  })

  it("takes the rebuilt order when it is asked to", () => {
    expect(walkthroughOf(carryWriting(arranged, rebuilt, "rebuilt"))).toStrictEqual(walkthroughOf(rebuilt))
  })

  it("keeps the title and the description of a Trace Diagram whose drawing did not change", () => {
    const traceOf = (writing?: Parameters<typeof mockTrace>[3]) =>
      mockTrace([priceSource, cartSource], [{ id: "price", type: "function", path: PRICE_PATH, declaration: "priceOf", isChanged: true, label: null, description: null }], [], writing)
    const written = createArtifact({ segments: [{ ...segment, traceDiagram: traceOf({ title: "Price item flow diagram", description: "A price is read." }) }] })
    const redrawn = createArtifact({ segments: [{ ...segment, traceDiagram: traceOf() }] })

    expect(carryWriting(written, redrawn, "written").segments[0].traceDiagram).toMatchObject({ title: "Price item flow diagram", description: "A price is read." })
  })

  it("carries the label of a row to the row of the same block at the same place, whatever order the rows come in", () => {
    const rowsAt = (labels: readonly (string | null)[], places: readonly { line: number, column: number }[]) =>
      places.map((at, index) => ({ codeBlockId: "price", type: "function" as const, name: "priceOf", label: labels[index], at }))
    const traceOf = (listedBlocks: ReturnType<typeof rowsAt>) =>
      mockTrace([priceSource, cartSource], [{ id: "price", type: "function", path: PRICE_PATH, declaration: "priceOf", isChanged: true, label: null, description: null, listedBlocks }], [])
    const written = createArtifact({
      segments: [{ ...segment, traceDiagram: traceOf(rowsAt(["Calls rates to read the rate", "Returns the price less the held amount"], [{ line: 11, column: 1 }, { line: 12, column: 3 }])) }],
    })
    const redrawn = createArtifact({
      segments: [{ ...segment, traceDiagram: traceOf(rowsAt([null, null, null], [{ line: 12, column: 3 }, { line: 12, column: 9 }, { line: 11, column: 1 }])) }],
    })

    const [node] = carryWriting(written, redrawn, "written").segments[0].traceDiagram?.traceNodes ?? []

    expect(node.blockLabels.map((listed) => listed.label)).toStrictEqual(["Returns the price less the held amount", null, "Calls rates to read the rate"])
  })

  it("carries the labels of a component card's returns, render rows and effects to the same rows", () => {
    const rowsOf = (labels: readonly (string | null)[]) => [
      { codeBlockId: "price", type: "component" as const, name: "priceOf", label: labels[0], at: { line: 11, column: 1 } },
      { codeBlockId: "held", type: "render-condition" as const, name: "condition", label: labels[1], range: { start: { line: 12, column: 3 }, end: { line: 12, column: 20 } } },
      { codeBlockId: "save", type: "component-effect" as const, name: "useEffect", label: labels[2] },
    ]
    const traceOf = (listedBlocks: ReturnType<typeof rowsOf>) =>
      mockTrace([priceSource, cartSource], [{ id: "price", type: "component", path: PRICE_PATH, declaration: "priceOf", isChanged: true, label: null, description: null, listedBlocks }], [])
    const written = createArtifact({
      segments: [{ ...segment, traceDiagram: traceOf(rowsOf(["Renders the price less the held amount", "Renders the held amount when there is one", "Saves the price after a render"])) }],
    })
    const redrawn = createArtifact({ segments: [{ ...segment, traceDiagram: traceOf([...rowsOf([null, null, null])].reverse()) }] })

    const [node] = carryWriting(written, redrawn, "written").segments[0].traceDiagram?.traceNodes ?? []

    expect(node.blockLabels.map((listed) => listed.label)).toStrictEqual(["Saves the price after a render", "Renders the held amount when there is one", "Renders the price less the held amount"])
  })
})
