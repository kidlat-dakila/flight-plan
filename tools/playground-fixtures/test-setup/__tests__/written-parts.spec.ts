import type { Codegraph, CodegraphSegment, LinkedWaypoint } from "@flightplan/codegraph"
import type { CodeBlock, TraceDiagram, TraceNode } from "@flightplan/configurations"
import { NOTHING_WRITTEN, readWrittenParts, withWrittenParts } from "@test-setup/written-parts"

const waypointOf = (declaration: string): LinkedWaypoint => ({
  id: "w1",
  title: null,
  declaration,
  codeBlocks: [],
  reading: "",
  coreChange: null,
  findings: [],
  children: [],
  isRequired: false,
  range: { lineStart: 4, lineEnd: 6 },
  category: "function",
  traceNodeId: "stock.ts#function@4:1",
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
  diffs: [],
  diffSources: [],
  classifications: ["logic"],
  diffClassifications: [],
  outerSymbols: [],
  usedBy: [],
  nextBlocks: [],
  handedFrom: [],
  astGraph: { filePath: "stock.ts", codeBlocks: [], rootBlocks: [], diffBlocks: [], diffContains: [], externalSymbols: [], externalBlocks: [], exports: new Map() },
  catalogue: null,
})

const nodeOf = (id: string, overrides: Partial<TraceNode> = {}): TraceNode => ({
  id,
  type: "function",
  label: null,
  description: null,
  codeBlocks: [blockOf(id, "function")],
  diffCodeBlocks: [],
  children: [],
  triggerLabels: [],
  blockLabels: [],
  isRequired: false,
  ...overrides,
})

const generatedTrace: TraceDiagram = {
  astCodeGroup: { astGraphs: [], rootASTGraphs: [], codeBlocks: [], diffBlocks: [], diffContains: [], chainContains: [], diffChains: [] },
  importGraphGroup: [],
  title: null,
  description: null,
  traceNodes: [
    nodeOf("reserve.tsx#component@1:1", {
      type: "component",
      triggerLabels: [{ label: null, codeBlock: blockOf("reserve.tsx#render-event@3:11", "render-event") }, { label: null, codeBlock: blockOf("reserve.tsx#data-fetch@2:9", "data-fetch") }],
      children: [nodeOf("badge.tsx#component@1:1", { type: "component" })],
    }),
    nodeOf("stock.ts#function@4:1"),
  ],
  traceNodeEdges: [{ id: "reserve.tsx#component@1:1 -> stock.ts#function@4:1", from: "reserve.tsx#component@1:1", to: "stock.ts#function@4:1" }],
  isRequired: false,
}

const generatedSegment: CodegraphSegment = {
  title: null,
  kind: "entry",
  importGraph: [],
  traceDiagram: generatedTrace,
  blastDiagram: {
    nodes: [
      { path: "reserve.ts", diffType: null, impactType: null, impactReason: null, isRequired: false },
      { path: "stock.ts", diffType: "modified", impactType: null, impactReason: null, isRequired: false },
    ],
    edges: [{ importer: "reserve.ts", imported: "stock.ts" }],
  },
  hiddenBlastDiagram: null,
  codeWalkthrough: { files: [{ path: "stock.ts", waypoints: [waypointOf("stockOf")] }] },
  codeReferences: [],
}

const generated: Codegraph = { segments: [generatedSegment] }

const writtenSnapshot = {
  title: "Modified function stockOf",
  diff: [],
  codegraph: {
    segments: [
      {
        title: "Stock check",
        context: ["## Summary", "", "Held stock is subtracted."],
        traceDiagram: {
          title: "Reserve item flow diagram",
          description: "A shopper reserves an item, and the stock is read.",
          traceNodes: [
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
        blastDiagram: {
          nodes: [
            { path: "reserve.ts", impactType: "behaviour-changes", impactReason: "A reservation is refused sooner.", isRequired: false },
            { path: "stock.ts", impactType: "breaks", impactReason: "A file of the change takes none.", isRequired: false },
            { path: "gone.ts", impactType: "unaffected", impactReason: null, isRequired: false },
          ],
        },
        codeWalkthrough: {
          files: [
            {
              path: "stock.ts",
              waypoints: [
                { declaration: "stockOf", title: "Subtract held units", reading: "The held units are subtracted.", coreChange: "Every checkout depends on it.", children: [] },
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
    expect(readWrittenParts({ codegraph: "not segments" })).toStrictEqual(NOTHING_WRITTEN)
  })

  it("reads the context of each segment of a snapshot", () => {
    expect(readWrittenParts(writtenSnapshot).codegraph.segments[0].context).toStrictEqual(["## Summary", "", "Held stock is subtracted."])
  })

  it("reads an empty context for a segment that has none written", () => {
    const [segment] = readWrittenParts({ codegraph: { segments: [{ title: null, traceDiagram: null, codeWalkthrough: { files: [] } }] } }).codegraph.segments

    expect(segment.context).toStrictEqual([])
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

  it("keeps what is written on the trace: the label and the description of each node at any depth, and the label of each trigger", () => {
    expect(segment.traceDiagram?.traceNodes).toMatchObject([
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

  it("keeps the title and the description written for the trace", () => {
    expect(segment.traceDiagram).toMatchObject({ title: "Reserve item flow diagram", description: "A shopper reserves an item, and the stock is read." })
  })

  it("keeps the impact written on a file the change did not touch, and none on a file of the change", () => {
    expect(segment.blastDiagram?.nodes).toStrictEqual([
      { path: "reserve.ts", diffType: null, impactType: "behaviour-changes", impactReason: "A reservation is refused sooner.", isRequired: false },
      { path: "stock.ts", diffType: "modified", impactType: null, impactReason: null, isRequired: false },
    ])
  })

  it("keeps what is written in the walkthrough: each waypoint", () => {
    expect(segment.codeWalkthrough).toMatchObject({
      files: [
        {
          waypoints: [{ title: "Subtract held units", reading: "The held units are subtracted.", coreChange: "Every checkout depends on it." }],
        },
      ],
    })
  })

  it("never takes what is generated from the snapshot: the nodes, the blocks, the edges, the ids and the lines stay the generated ones", () => {
    const [reserve, stock] = segment.traceDiagram?.traceNodes ?? []

    expect([reserve.id, stock.id]).toStrictEqual(["reserve.tsx#component@1:1", "stock.ts#function@4:1"])
    expect(reserve.codeBlocks).toStrictEqual(generatedTrace.traceNodes[0].codeBlocks)
    expect(reserve.triggerLabels.map((trigger) => trigger.codeBlock)).toStrictEqual(generatedTrace.traceNodes[0].triggerLabels.map((trigger) => trigger.codeBlock))
    expect(segment.traceDiagram?.traceNodeEdges).toStrictEqual(generatedTrace.traceNodeEdges)
    expect(segment.blastDiagram?.edges).toStrictEqual(generatedSegment.blastDiagram?.edges)
    expect(segment.codeWalkthrough.files[0].waypoints[0]).toMatchObject({ id: "w1", range: { lineStart: 4, lineEnd: 6 }, category: "function" })
  })

  it("keeps the rest of a snapshot whose trace was written in a shape it no longer has", () => {
    const older = {
      ...writtenSnapshot,
      codegraph: { segments: writtenSnapshot.codegraph.segments.map((writtenSegment) => ({ ...writtenSegment, traceDiagram: { caption: "An older trace", nodes: [] } })) },
    }
    const [olderSegment] = withWrittenParts(generated, readWrittenParts(older)).segments

    expect(olderSegment.title).toBe("Stock check")
    expect(olderSegment.traceDiagram).toStrictEqual(generatedTrace)
  })

  it("leaves a node, a file or a waypoint the snapshot does not have as it was generated", () => {
    const renamed: Codegraph = {
      segments: [
        {
          ...generatedSegment,
          codeWalkthrough: { files: [{ path: "stock.ts", waypoints: [waypointOf("availableOf")] }] },
          codeReferences: [],
        },
      ],
    }

    const [renamedSegment] = withWrittenParts(renamed, readWrittenParts(writtenSnapshot)).segments

    expect(renamedSegment.codeWalkthrough.files[0].waypoints[0]).toMatchObject({ declaration: "availableOf", title: null, reading: "" })
  })
})
