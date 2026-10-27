import { locatePart } from "@/procedures/build-text-reference/utils/locate-part"
import type { ArtifactPart } from "@/procedures/build-text-reference/utils/schemas"
import { CONTEXT_ARTIFACT, DRAFT_SEGMENT, SUBTOTAL_BLOCK_ID } from "@/procedures/read-artifact/utils/__tests__/artifact-fixture"
import type { ReviewArtifact, Segment, TraceDiagram } from "@flightplan/configurations"

const IMPORT_BOUND_PATH = "src/catalog/prices.json"

const withNestedParts = (segment: Segment, traceDiagram: TraceDiagram): Segment => {
  const [priceFile, ...otherFiles] = segment.walkthrough.files
  const [priceWaypoint] = priceFile.waypoints
  const [traceNode] = traceDiagram.traceNodes
  return {
    ...segment,
    traceDiagram: { ...traceDiagram, traceNodes: [{ ...traceNode, children: [{ ...traceNode, id: "j-inner", children: [] }] }] },
    blastDiagram: {
      nodes: segment.blastDiagram?.nodes ?? [],
      edges: segment.blastDiagram?.edges ?? [],
      importBound: { nodes: [{ path: IMPORT_BOUND_PATH, diffType: null }], edges: [] },
    },
    walkthrough: {
      files: [
        { ...priceFile, waypoints: [{ ...priceWaypoint, children: [{ ...priceWaypoint, id: "w1-child", children: [] }] }] },
        ...otherFiles,
      ],
    },
  }
}

const createArtifact = (): ReviewArtifact => {
  if (DRAFT_SEGMENT.traceDiagram === null) throw new Error("The draft segment has a Trace Diagram.")
  return {
    ...CONTEXT_ARTIFACT,
    segments: [withNestedParts(DRAFT_SEGMENT, DRAFT_SEGMENT.traceDiagram), { ...DRAFT_SEGMENT, id: "bare", traceDiagram: null, blastDiagram: null }],
  }
}

const ARTIFACT = createArtifact()

describe("locatePart", () => {
  it("keeps every part the review artifact holds, nested ones included", () => {
    const parts: ArtifactPart[] = [
      { kind: "review" },
      { kind: "segment", segmentId: "all" },
      { kind: "waypoint", waypointId: "w3" },
      { kind: "waypoint", waypointId: "w1-child" },
      { kind: "trace-diagram", segmentId: "all" },
      { kind: "trace-node", segmentId: "all", nodeId: "j-subtotal" },
      { kind: "trace-node", segmentId: "all", nodeId: "j-inner" },
      { kind: "blast-node", segmentId: "all", path: "src/cart/CartPage.tsx" },
      { kind: "blast-node", segmentId: "all", path: IMPORT_BOUND_PATH },
      { kind: "context-code-block", blockId: SUBTOTAL_BLOCK_ID },
    ]

    expect(parts.map((part) => locatePart(ARTIFACT, part))).toStrictEqual(parts)
  })

  it("falls back to the segment for a part its segment does not hold", () => {
    expect([
      locatePart(ARTIFACT, { kind: "trace-diagram", segmentId: "bare" }),
      locatePart(ARTIFACT, { kind: "trace-node", segmentId: "bare", nodeId: "j-subtotal" }),
      locatePart(ARTIFACT, { kind: "blast-node", segmentId: "all", path: "src/gone.ts" }),
    ]).toStrictEqual([
      { kind: "segment", segmentId: "bare" },
      { kind: "segment", segmentId: "bare" },
      { kind: "segment", segmentId: "all" },
    ])
  })

  it("falls back to the review for a part outside every segment that the artifact does not hold", () => {
    expect([
      locatePart(ARTIFACT, { kind: "segment", segmentId: "gone" }),
      locatePart(ARTIFACT, { kind: "trace-node", segmentId: "gone", nodeId: "j-subtotal" }),
      locatePart(ARTIFACT, { kind: "waypoint", waypointId: "gone" }),
      locatePart(ARTIFACT, { kind: "context-code-block", blockId: "gone" }),
    ]).toStrictEqual([{ kind: "review" }, { kind: "review" }, { kind: "review" }, { kind: "review" }])
  })
})
