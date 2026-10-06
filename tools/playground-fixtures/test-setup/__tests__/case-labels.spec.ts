import { ASTCodeGroupGraph, type Codegraph, type CodegraphSegment, type LinkedWaypoint } from "@flightplan/codegraph"
import { labelCodegraph, SegmentCountError, UnknownLabelTargetError } from "@test-setup/case-labels"

const STOCK_NODE_ID = "src/stock.ts#stockOf"
const ENTRY_NODE_ID = "entry:src/stock.ts#stockOf"

const waypoint: LinkedWaypoint = {
  id: "w1",
  title: null,
  declaration: "stockOf",
  reading: "",
  needsAttention: null,
  findings: [],
  children: [],
  range: { lineStart: 3, lineEnd: 5 },
  category: "function",
  journeyFlowId: "journey:src/stock.ts#stockOf",
  journeyNodeId: STOCK_NODE_ID,
  blastNodeId: STOCK_NODE_ID,
}

const segment: CodegraphSegment = {
  title: null,
  importGraph: [],
  astGraph: new ASTCodeGroupGraph([]),
  journeyFlowDiagram: {
    id: "journey:src/stock.ts#stockOf",
    title: "stockOf",
    nodes: [
      { kind: "entry-point", id: ENTRY_NODE_ID, label: "stockOf", description: null },
      {
        kind: "declaration",
        id: STOCK_NODE_ID,
        path: "src/stock.ts",
        declaration: "stockOf",
        isChanged: true,
        category: "logic",
        label: null,
        description: null,
      },
    ],
    edges: [{ from: ENTRY_NODE_ID, to: STOCK_NODE_ID, kind: "trigger", certainty: "proven" }],
  },
  blastRadiusDiagram: {
    nodes: [
      {
        id: STOCK_NODE_ID,
        ring: 0,
        path: "src/stock.ts",
        declaration: "stockOf",
        label: null,
        contract: null,
        verdict: null,
        effect: null,
      },
    ],
    edges: [],
  },
  codeWalkthrough: {
    intro: null,
    files: [{ path: "src/stock.ts", title: "src/stock.ts", summary: [], waypoints: [waypoint] }],
  },
}

const codegraph: Codegraph = { segments: [segment] }

describe("labelCodegraph", () => {
  it("returns the codegraph as it is when a case writes no labels", () => {
    expect(labelCodegraph(codegraph, undefined)).toBe(codegraph)
  })

  it("titles a segment", () => {
    expect(labelCodegraph(codegraph, [{ title: "Available stock" }]).segments[0].title).toBe("Available stock")
  })

  it("labels the journey, its nodes and its entry point", () => {
    const [labelled] = labelCodegraph(codegraph, [
      {
        title: "Available stock",
        journeyFlowDiagram: {
          title: "A shopper checks stock",
          nodes: {
            [ENTRY_NODE_ID]: { label: "Shopper opens a product" },
            [STOCK_NODE_ID]: { label: "Reads available stock", description: "Subtracts held units.", category: "data" },
          },
        },
      },
    ]).segments

    expect(labelled.journeyFlowDiagram?.title).toBe("A shopper checks stock")
    expect(labelled.journeyFlowDiagram?.nodes).toStrictEqual([
      { kind: "entry-point", id: ENTRY_NODE_ID, label: "Shopper opens a product", description: null },
      {
        kind: "declaration",
        id: STOCK_NODE_ID,
        path: "src/stock.ts",
        declaration: "stockOf",
        isChanged: true,
        category: "data",
        label: "Reads available stock",
        description: "Subtracts held units.",
      },
    ])
  })

  it("labels a blast node with its contract, verdict and effect", () => {
    const [labelled] = labelCodegraph(codegraph, [
      {
        title: "Available stock",
        blastRadiusDiagram: {
          nodes: {
            [STOCK_NODE_ID]: {
              label: "Available stock",
              contract: { before: "Returned all stock.", now: "Returns stock that is not held." },
              verdict: "behaviour-changes",
              effect: "Fewer units are sellable.",
            },
          },
        },
      },
    ]).segments

    expect(labelled.blastRadiusDiagram.nodes[0]).toMatchObject({
      label: "Available stock",
      contract: { before: "Returned all stock.", now: "Returns stock that is not held." },
      verdict: "behaviour-changes",
      effect: "Fewer units are sellable.",
    })
  })

  it("labels the walkthrough, a file and a waypoint named by its declaration", () => {
    const [labelled] = labelCodegraph(codegraph, [
      {
        title: "Available stock",
        codeWalkthrough: {
          intro: "One function changes.",
          files: {
            "src/stock.ts": {
              title: "Stock",
              summary: ["Held units are subtracted."],
              waypoints: { stockOf: { title: "Subtract held units", reading: "The function now subtracts." } },
            },
          },
        },
      },
    ]).segments

    expect(labelled.codeWalkthrough.intro).toBe("One function changes.")
    expect(labelled.codeWalkthrough.files[0]).toMatchObject({ title: "Stock", summary: ["Held units are subtracted."] })
    expect(labelled.codeWalkthrough.files[0].waypoints[0]).toMatchObject({
      id: "w1",
      title: "Subtract held units",
      reading: "The function now subtracts.",
    })
  })

  it("keeps what a case does not label", () => {
    const [labelled] = labelCodegraph(codegraph, [{ title: "Available stock" }]).segments

    expect(labelled.journeyFlowDiagram).toBe(segment.journeyFlowDiagram)
    expect(labelled.blastRadiusDiagram).toBe(segment.blastRadiusDiagram)
    expect(labelled.codeWalkthrough).toBe(segment.codeWalkthrough)
  })

  it("refuses a different number of segments", () => {
    expect(() => labelCodegraph(codegraph, [])).toThrow(SegmentCountError)
  })

  it.each([
    ["a journey node", { title: "Stock", journeyFlowDiagram: { nodes: { "src/stock.ts#missing": { label: "Gone" } } } }],
    ["a blast node", { title: "Stock", blastRadiusDiagram: { nodes: { "src/stock.ts#missing": { label: "Gone" } } } }],
    ["a file", { title: "Stock", codeWalkthrough: { files: { "src/missing.ts": { title: "Gone" } } } }],
    ["a waypoint", { title: "Stock", codeWalkthrough: { files: { "src/stock.ts": { waypoints: { missing: { title: "Gone" } } } } } }],
  ])("refuses a label for %s the codegraph does not have", (_what, labels) => {
    expect(() => labelCodegraph(codegraph, [labels])).toThrow(UnknownLabelTargetError)
  })

  it("refuses journey labels when the segment has no journey", () => {
    const withoutJourney: Codegraph = { segments: [{ ...segment, journeyFlowDiagram: null }] }

    expect(() => labelCodegraph(withoutJourney, [{ title: "Stock", journeyFlowDiagram: { title: "Gone" } }])).toThrow(
      UnknownLabelTargetError,
    )
  })
})
