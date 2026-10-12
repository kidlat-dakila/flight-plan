import { planContextEdit } from "@/procedures/edit-context/utils/plan-context-edit"
import { createArtifact, createSegment } from "@/procedures/get-review/utils/__tests__/review-fixture"

const artifact = createArtifact({
  segments: [createSegment({ id: "stock", context: "Old stock context." }), createSegment({ id: "cart", context: "Old cart context." })],
})

describe("planContextEdit", () => {
  it("replaces the context of the named segment alone, trimmed, and keeps a code link the artifact resolves", () => {
    const context = "  The price now counts held units. See [`priceOf`](code:src/price.ts#priceOf).\n"

    const planned = planContextEdit(artifact, { segmentId: "stock", context })

    expect(planned.kind === "planned" ? planned.artifact.segments.map((segment) => segment.context) : null).toStrictEqual([
      "The price now counts held units. See [`priceOf`](code:src/price.ts#priceOf).",
      "Old cart context.",
    ])
  })

  it("rejects a context that is empty", () => {
    expect(planContextEdit(artifact, { segmentId: "stock", context: " \n " })).toStrictEqual({
      kind: "rejected",
      message: "Write the context. A segment cannot be without one.",
    })
  })

  it("rejects a segment the Flight Plan does not have", () => {
    expect(planContextEdit(artifact, { segmentId: "gone", context: "Text." })).toStrictEqual({
      kind: "rejected",
      message: "This segment is no longer in the Flight Plan.",
    })
  })

  it("rejects a code link that points at code the Flight Plan does not hold", () => {
    expect(planContextEdit(artifact, { segmentId: "stock", context: "See [x](code:src/gone.ts#nothing)." })).toStrictEqual({
      kind: "rejected",
      message: "This code link points at code the Flight Plan does not hold: src/gone.ts#nothing.",
    })
  })
})
