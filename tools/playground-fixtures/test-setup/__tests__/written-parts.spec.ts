import type { Codegraph, CodegraphSegment, LinkedWaypoint } from "@flightplan/codegraph"
import type { CodeBlock, JourneyFlowDiagram, JourneyNode } from "@flightplan/configurations"
import { NOTHING_WRITTEN, readWrittenParts, withWrittenParts } from "@test-setup/written-parts"

const waypointOf = (declaration: string): LinkedWaypoint => ({
  id: "w1",
  title: null,
  declaration,
  reading: "",
  needsAttention: null,
  findings: [],
  children: [],
  range: { lineStart: 4, lineEnd: 6 },
  category: "function",
  journeyNodeId: "stock.ts#function@4:1",
})

const FIRST_POSITION = { line: 1, column: 1 }

const blockOf = (id: string, type: CodeBlock["type"]): CodeBlock => ({
  id,
  type,
  lineOfCodeRangeReference: [{ start: FIRST_POSITION, end: FIRST_POSITION }],
  parentBlock: null,
  childrenBlocks: [],
  isRoot: true,
  isExported: false,
  exportedBy: [],
  lineOfCodeDiffs: null,
  diffSources: [],
  outerSymbols: [],
  usedBy: [],
  nextBlocks: [],
  handedFrom: [],
  astGraph: { filePath: "stock.ts", codeBlocks: [], rootBlocks: [], diffBlocks: [], diffContains: [], externalSymbols: [], externalBlocks: [], exports: new Map() },
  catalogue: null,
})

const nodeOf = (id: string, overrides: Partial<JourneyNode> = {}): JourneyNode => ({
  id,
  type: "function",
  label: null,
  description: null,
  codeBlocks: [blockOf(id, "function")],
  diffCodeBlocks: [],
  children: [],
  triggerLabels: [],
  ...overrides,
})

const generatedJourney: JourneyFlowDiagram = {
  astCodeGroup: { astGraphs: [], rootASTGraphs: [], codeBlocks: [], diffBlocks: [], diffContains: [], chainContains: [], diffChains: [] },
  importGraphGroup: [],
  journeyNodes: [
    nodeOf("reserve.tsx#component@1:1", {
      type: "component",
      triggerLabels: [{ label: null, codeBlock: blockOf("reserve.tsx#render-event@3:11", "render-event") }, { label: null, codeBlock: blockOf("reserve.tsx#data-fetch@2:9", "data-fetch") }],
      children: [nodeOf("badge.tsx#component@1:1", { type: "component" })],
    }),
    nodeOf("stock.ts#function@4:1"),
  ],
  journeyNodeEdges: [{ id: "reserve.tsx#component@1:1 -> stock.ts#function@4:1", from: "reserve.tsx#component@1:1", to: "stock.ts#function@4:1" }],
}

const generatedSegment: CodegraphSegment = {
  title: null,
  kind: "entry",
  importGraph: [],
  journeyFlowDiagram: generatedJourney,
  blastRadiusDiagram: {
    nodes: [
      { path: "reserve.ts", diffType: null, impactType: null, impactReason: null },
      { path: "stock.ts", diffType: "modified", impactType: null, impactReason: null },
    ],
    edges: [{ importer: "reserve.ts", imported: "stock.ts" }],
  },
  codeWalkthrough: { intro: null, files: [{ path: "stock.ts", title: "stock.ts", summary: [], waypoints: [waypointOf("stockOf")] }] },
  codeReferences: [],
}

const generated: Codegraph = { segments: [generatedSegment] }

const writtenSnapshot = {
  title: "Modified function stockOf",
  context: ["## Summary", "", "Held stock is subtracted."],
  diff: [],
  codegraph: {
    segments: [
      {
        title: "Stock check",
        journeyFlowDiagram: {
          journeyNodes: [
            {
              id: "reserve.tsx#component@1:1",
              label: "Reserves an item",
              description: "From the checkout.",
              triggerLabels: [{ codeBlockId: "reserve.tsx#render-event@3:11", label: "A shopper clicks Reserve" }, { codeBlockId: "gone.tsx#render-event@1:1", label: "A trigger the node no longer has" }],
              children: [{ id: "badge.tsx#component@1:1", label: "Shows the stock", description: null }],
            },
            { id: "stock.ts#function@4:1", label: "Available stock", description: "Stock minus held units." },
            { id: "gone.ts#function@1:1", label: "A node the codegraph no longer has", description: null },
          ],
        },
        blastRadiusDiagram: {
          nodes: [
            { path: "reserve.ts", impactType: "behaviour-changes", impactReason: "A reservation is refused sooner." },
            { path: "stock.ts", impactType: "breaks", impactReason: "A file of the change takes none." },
            { path: "gone.ts", impactType: "unaffected", impactReason: null },
          ],
        },
        codeWalkthrough: {
          intro: "One function changes.",
          files: [
            {
              path: "stock.ts",
              title: "Held units leave the stock",
              summary: ["`stockOf` subtracts held units."],
              waypoints: [
                { declaration: "stockOf", title: "Subtract held units", reading: "The held units are subtracted.", needsAttention: "Every checkout depends on it.", children: [] },
              ],
            },
          ],
        },
      },
    ],
  },
}

describe("readWrittenParts", () => {
  it("reads nothing written from what is not a snapshot", () => {
    expect(readWrittenParts(null)).toStrictEqual(NOTHING_WRITTEN)
    expect(readWrittenParts({ context: "not lines" })).toStrictEqual(NOTHING_WRITTEN)
  })

  it("reads the context of a snapshot", () => {
    expect(readWrittenParts(writtenSnapshot).context).toStrictEqual(["## Summary", "", "Held stock is subtracted."])
  })
})

describe("withWrittenParts", () => {
  const [segment] = withWrittenParts(generated, readWrittenParts(writtenSnapshot)).segments

  it("leaves a codegraph as it was generated when nothing is written", () => {
    expect(withWrittenParts(generated, NOTHING_WRITTEN)).toStrictEqual(generated)
  })

  it("keeps the written title of a segment", () => {
    expect(segment.title).toBe("Stock check")
  })

  it("keeps what is written on the journey: the label and the description of each node at any depth, and the label of each trigger", () => {
    expect(segment.journeyFlowDiagram?.journeyNodes).toMatchObject([
      {
        id: "reserve.tsx#component@1:1",
        label: "Reserves an item",
        description: "From the checkout.",
        triggerLabels: [{ label: "A shopper clicks Reserve" }, { label: null }],
        children: [{ id: "badge.tsx#component@1:1", label: "Shows the stock", description: null }],
      },
      { id: "stock.ts#function@4:1", label: "Available stock", description: "Stock minus held units." },
    ])
  })

  it("keeps the impact written on a file the change did not touch, and none on a file of the change", () => {
    expect(segment.blastRadiusDiagram?.nodes).toStrictEqual([
      { path: "reserve.ts", diffType: null, impactType: "behaviour-changes", impactReason: "A reservation is refused sooner." },
      { path: "stock.ts", diffType: "modified", impactType: null, impactReason: null },
    ])
  })

  it("keeps what is written in the walkthrough: its intro, each file and each waypoint", () => {
    expect(segment.codeWalkthrough).toMatchObject({
      intro: "One function changes.",
      files: [
        {
          title: "Held units leave the stock",
          summary: ["`stockOf` subtracts held units."],
          waypoints: [{ title: "Subtract held units", reading: "The held units are subtracted.", needsAttention: "Every checkout depends on it." }],
        },
      ],
    })
  })

  it("never takes what is generated from the snapshot: the nodes, the blocks, the edges, the ids and the lines stay the generated ones", () => {
    const [reserve, stock] = segment.journeyFlowDiagram?.journeyNodes ?? []

    expect([reserve.id, stock.id]).toStrictEqual(["reserve.tsx#component@1:1", "stock.ts#function@4:1"])
    expect(reserve.codeBlocks).toStrictEqual(generatedJourney.journeyNodes[0].codeBlocks)
    expect(reserve.triggerLabels.map((trigger) => trigger.codeBlock)).toStrictEqual(generatedJourney.journeyNodes[0].triggerLabels.map((trigger) => trigger.codeBlock))
    expect(segment.journeyFlowDiagram?.journeyNodeEdges).toStrictEqual(generatedJourney.journeyNodeEdges)
    expect(segment.blastRadiusDiagram?.edges).toStrictEqual(generatedSegment.blastRadiusDiagram?.edges)
    expect(segment.codeWalkthrough.files[0].waypoints[0]).toMatchObject({ id: "w1", range: { lineStart: 4, lineEnd: 6 }, category: "function" })
  })

  it("keeps the rest of a snapshot whose journey was written in a shape it no longer has", () => {
    const older = {
      ...writtenSnapshot,
      codegraph: { segments: writtenSnapshot.codegraph.segments.map((writtenSegment) => ({ ...writtenSegment, journeyFlowDiagram: { title: "An older journey", nodes: [] } })) },
    }
    const [olderSegment] = withWrittenParts(generated, readWrittenParts(older)).segments

    expect(olderSegment.title).toBe("Stock check")
    expect(olderSegment.journeyFlowDiagram).toStrictEqual(generatedJourney)
  })

  it("leaves a node, a file or a waypoint the snapshot does not have as it was generated", () => {
    const renamed: Codegraph = {
      segments: [
        {
          ...generatedSegment,
          codeWalkthrough: { intro: null, files: [{ path: "stock.ts", title: "stock.ts", summary: [], waypoints: [waypointOf("availableOf")] }] },
          codeReferences: [],
        },
      ],
    }

    const [renamedSegment] = withWrittenParts(renamed, readWrittenParts(writtenSnapshot)).segments

    expect(renamedSegment.codeWalkthrough.files[0].waypoints[0]).toMatchObject({ declaration: "availableOf", title: null, reading: "" })
  })
})
