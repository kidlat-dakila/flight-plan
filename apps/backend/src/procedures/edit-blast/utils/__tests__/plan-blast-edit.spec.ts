import { planBlastEdit } from "@/procedures/edit-blast/utils/plan-blast-edit"
import { createArtifact, createSegment, PRICE_PATH } from "@/procedures/get-review/utils/__tests__/review-fixture"

const REPORT_PATH = "src/report.ts"
const CART_PATH = "src/cart.ts"

const blast = {
  nodes: [
    { path: CART_PATH, diffType: null, impactType: "breaks" as const, impactReason: "It assumes a price is never negative." },
    { path: PRICE_PATH, diffType: "modified" as const, impactType: null, impactReason: null },
    { path: REPORT_PATH, diffType: null, impactType: null, impactReason: null },
  ],
  edges: [
    { importer: CART_PATH, imported: PRICE_PATH },
    { importer: REPORT_PATH, imported: PRICE_PATH },
  ],
}

const artifact = createArtifact({
  segments: [createSegment({ id: "stock", blast }), createSegment({ id: "cart", blast }), createSegment({ id: "bare", blast: null })],
})

const nodesOf = (planned: ReturnType<typeof planBlastEdit>, path: string): unknown =>
  planned.kind === "planned" ? planned.artifact.segments.map((segment) => segment.blast?.nodes.find((node) => node.path === path) ?? null) : null

describe("planBlastEdit", () => {
  it("writes the impact type and the trimmed reason on the file in every Blast Diagram that holds it, and keeps a code link the artifact resolves", () => {
    const impactReason = "  It sums [`priceOf`](code:src/price.ts#priceOf), which can now be negative.\n"

    const planned = planBlastEdit(artifact, { path: REPORT_PATH, impactType: "behaviour-changes", impactReason })

    const written = {
      path: REPORT_PATH,
      diffType: null,
      impactType: "behaviour-changes",
      impactReason: "It sums [`priceOf`](code:src/price.ts#priceOf), which can now be negative.",
    }
    expect(nodesOf(planned, REPORT_PATH)).toStrictEqual([written, written, null])
    expect(nodesOf(planned, CART_PATH)).toStrictEqual([blast.nodes[0], blast.nodes[0], null])
  })

  it("drops the reason of a file that becomes unaffected", () => {
    const planned = planBlastEdit(artifact, { path: CART_PATH, impactType: "unaffected", impactReason: "Left over." })

    expect(nodesOf(planned, CART_PATH)).toMatchObject([{ impactType: "unaffected", impactReason: null }, { impactType: "unaffected", impactReason: null }, null])
  })

  it("takes the assessment of a file back", () => {
    const planned = planBlastEdit(artifact, { path: CART_PATH, impactType: "unassessed", impactReason: "" })

    expect(nodesOf(planned, CART_PATH)).toMatchObject([{ impactType: null, impactReason: null }, { impactType: null, impactReason: null }, null])
  })

  it("rejects a file that breaks or changes behaviour with no reason", () => {
    expect(planBlastEdit(artifact, { path: REPORT_PATH, impactType: "breaks", impactReason: " \n" })).toStrictEqual({
      kind: "rejected",
      message: "Write the reason. A file the change breaks or changes needs one.",
    })
  })

  it("rejects a file of the change", () => {
    expect(planBlastEdit(artifact, { path: PRICE_PATH, impactType: "unaffected", impactReason: "" })).toStrictEqual({
      kind: "rejected",
      message: "This file is part of the change. An impact is what the change does to a file it did not touch.",
    })
  })

  it("rejects a file no Blast Diagram holds", () => {
    expect(planBlastEdit(artifact, { path: "src/gone.ts", impactType: "unaffected", impactReason: "" })).toStrictEqual({
      kind: "rejected",
      message: "This file is no longer in the Blast Diagram.",
    })
  })

  it("rejects a code link that points at code the Flight Plan does not hold", () => {
    expect(planBlastEdit(artifact, { path: REPORT_PATH, impactType: "breaks", impactReason: "See [x](code:src/gone.ts#nothing)." })).toStrictEqual({
      kind: "rejected",
      message: "This code link points at code the Flight Plan does not hold: src/gone.ts#nothing.",
    })
  })
})
