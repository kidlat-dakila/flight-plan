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
})
