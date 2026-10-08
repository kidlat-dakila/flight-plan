import { ASTCodeGroupGraph, type Codegraph, type CodegraphSegment, type LinkedWaypoint } from "@flightplan/codegraph"
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
  journeyFlowId: "journey:stock.ts#stockOf",
  journeyNodeId: "stock.ts#stockOf",
  blastNodeId: "stock.ts#stockOf",
})

const generatedSegment: CodegraphSegment = {
  title: null,
  importGraph: [],
  astGraph: new ASTCodeGroupGraph([]),
  journeyFlowDiagram: {
    id: "journey:stock.ts#stockOf",
    title: "stockOf",
    nodes: [
      { kind: "entry-point", id: "entry:reserve.ts#reserve", trigger: "user-action", label: "reserve", description: null, traceEnd: null },
      { kind: "declaration", id: "stock.ts#stockOf", path: "stock.ts", declaration: "stockOf", changeType: "diff", isAdded: false, category: "logic", label: null, description: null, tracedLines: [], events: [], data: [] },
    ],
    edges: [{ from: "entry:reserve.ts#reserve", to: "stock.ts#stockOf", kind: "trigger", certainty: "proven", through: [], condition: null }],
  },
  blastRadiusDiagram: {
    nodes: [{ id: "stock.ts#stockOf", ring: 0, path: "stock.ts", declaration: "stockOf", label: null, contract: null, verdict: null, effect: null }],
    edges: [],
  },
  codeWalkthrough: { intro: null, files: [{ path: "stock.ts", title: "stock.ts", summary: [], waypoints: [waypointOf("stockOf")] }] },
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
          title: "A shopper reserves an item",
          nodes: [
            { id: "entry:reserve.ts#reserve", label: "A shopper reserves", description: "From the checkout." },
            { id: "stock.ts#stockOf", label: "Available stock", description: "Stock minus held units.", category: "data" },
            { id: "gone.ts#removed", label: "A node the codegraph no longer has", description: null, category: "ui" },
          ],
        },
        blastRadiusDiagram: {
          nodes: [
            {
              id: "stock.ts#stockOf",
              label: "Available stock",
              contract: { before: "Returned the stock.", now: "Returns the stock minus held units." },
              verdict: null,
              effect: "A reservation is refused sooner.",
            },
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

  it("keeps what is written on the journey: its title and the label, description and category of each node", () => {
    expect(segment.journeyFlowDiagram).toMatchObject({
      title: "A shopper reserves an item",
      nodes: [
        { id: "entry:reserve.ts#reserve", label: "A shopper reserves", description: "From the checkout." },
        { id: "stock.ts#stockOf", label: "Available stock", description: "Stock minus held units.", category: "data" },
      ],
    })
  })

  it("keeps what is written on a blast node", () => {
    expect(segment.blastRadiusDiagram.nodes[0]).toMatchObject({
      label: "Available stock",
      contract: { before: "Returned the stock.", now: "Returns the stock minus held units." },
      verdict: null,
      effect: "A reservation is refused sooner.",
    })
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

  it("never takes what is generated from the snapshot: the nodes, the edges, the ids and the lines stay the generated ones", () => {
    expect(segment.journeyFlowDiagram?.nodes.map((node) => node.id)).toStrictEqual(["entry:reserve.ts#reserve", "stock.ts#stockOf"])
    expect(segment.journeyFlowDiagram?.edges).toStrictEqual(generatedSegment.journeyFlowDiagram?.edges)
    expect(segment.blastRadiusDiagram.nodes[0].ring).toBe(0)
    expect(segment.codeWalkthrough.files[0].waypoints[0]).toMatchObject({ id: "w1", range: { lineStart: 4, lineEnd: 6 }, category: "function" })
  })

  it("keeps a generated category of ui or event over the written one, with the written label", () => {
    const journey = generatedSegment.journeyFlowDiagram
    const handled: Codegraph = {
      segments: [
        {
          ...generatedSegment,
          journeyFlowDiagram:
            journey === null ? null : { ...journey, nodes: journey.nodes.map((node) => (node.kind === "declaration" ? { ...node, category: "event" } : node)) },
        },
      ],
    }

    const [handledSegment] = withWrittenParts(handled, readWrittenParts(writtenSnapshot)).segments

    expect(handledSegment.journeyFlowDiagram?.nodes[1]).toMatchObject({ category: "event", label: "Available stock" })
  })

  it("leaves a node, a file or a waypoint the snapshot does not have as it was generated", () => {
    const renamed: Codegraph = {
      segments: [
        {
          ...generatedSegment,
          codeWalkthrough: { intro: null, files: [{ path: "stock.ts", title: "stock.ts", summary: [], waypoints: [waypointOf("availableOf")] }] },
        },
      ],
    }

    const [renamedSegment] = withWrittenParts(renamed, readWrittenParts(writtenSnapshot)).segments

    expect(renamedSegment.codeWalkthrough.files[0].waypoints[0]).toMatchObject({ declaration: "availableOf", title: null, reading: "" })
  })
})
