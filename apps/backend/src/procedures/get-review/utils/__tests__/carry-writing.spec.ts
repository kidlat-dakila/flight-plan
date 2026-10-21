import { carryWriting } from "@/procedures/get-review/utils/carry-writing"
import type { ReviewArtifact } from "@flightplan/configurations"
import { createArtifact, createSegment } from "./review-fixture"

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
})
