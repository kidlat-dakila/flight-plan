import { createDeclarationNode } from "@/procedures/get-review/utils/__tests__/review-fixture"
import { filterJourney, type DiagramSettings } from "@/procedures/get-review/utils/journey/filter"
import type { JourneyEdge, JourneyFlow } from "@/procedures/get-review/utils/review-artifact"

const EVERYTHING: DiagramSettings = { levels: null, isShowingData: true, isShowingAssumed: true }

const edge = (from: string, to: string, overrides: Partial<JourneyEdge> = {}): JourneyEdge => ({
  from,
  to,
  kind: "call",
  certainty: "proven",
  ...overrides,
})

const flow: JourneyFlow = {
  id: "flow",
  title: "Flow",
  nodes: [
    { kind: "entry-point", id: "click", label: "Click", description: null },
    { kind: "entry-point", id: "load", label: "Load", description: null },
    createDeclarationNode("route"),
    createDeclarationNode("checkout"),
    createDeclarationNode("hook"),
    createDeclarationNode("price", { isChanged: true }),
    createDeclarationNode("badge"),
  ],
  edges: [
    edge("click", "route", { kind: "trigger" }),
    edge("load", "hook", { kind: "trigger" }),
    edge("route", "checkout"),
    edge("checkout", "price"),
    edge("hook", "price", { kind: "value", certainty: "assumed" }),
    edge("price", "badge", { kind: "data" }),
  ],
}

const idsOf = (filtered: JourneyFlow): string[] => filtered.nodes.map((node) => node.id)

describe("filterJourney", () => {
  it("keeps the whole trace when every setting is on", () => {
    expect(idsOf(filterJourney(flow, EVERYTHING))).toStrictEqual(idsOf(flow))
    expect(filterJourney(flow, EVERYTHING).edges).toHaveLength(flow.edges.length)
  })

  it("hides a data edge and the node reached only through it", () => {
    const filtered = filterJourney(flow, { ...EVERYTHING, isShowingData: false })

    expect(idsOf(filtered)).not.toContain("badge")
    expect(filtered.edges.map((shown) => shown.kind)).not.toContain("data")
  })

  it("hides an assumed edge, the node above it and that node's entry point", () => {
    const filtered = filterJourney(flow, { ...EVERYTHING, isShowingAssumed: false })

    expect(idsOf(filtered)).toStrictEqual(["click", "route", "checkout", "price", "badge"])
  })

  it("keeps a node that is still reached through another shown edge", () => {
    const diamond: JourneyFlow = { ...flow, edges: [...flow.edges, edge("hook", "checkout")] }

    expect(idsOf(filterJourney(diamond, { ...EVERYTHING, isShowingAssumed: false }))).toContain("hook")
  })

  it("cuts the Tail Nodes above the chosen number of levels, and their entry points", () => {
    expect(idsOf(filterJourney(flow, { ...EVERYTHING, levels: 1 }))).toStrictEqual(["load", "checkout", "hook", "price", "badge"])
    expect(idsOf(filterJourney(flow, { ...EVERYTHING, levels: 0 }))).toStrictEqual(["price", "badge"])
  })

  it("never hides a Head Node", () => {
    const filtered = filterJourney(flow, { levels: 0, isShowingData: false, isShowingAssumed: false })

    expect(idsOf(filtered)).toStrictEqual(["price"])
  })
})
