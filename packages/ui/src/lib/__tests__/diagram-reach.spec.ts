import { cutOffBy, downstreamOf, hiddenBehind, lineageOf, neighbourhoodOf, pathFrom, sourcesLeadingTo, type Connection } from "@/lib/diagram-reach"

const CONNECTIONS: readonly Connection[] = [
  { id: "visit>page", from: "visit", to: "page" },
  { id: "page>list", from: "page", to: "list" },
  { id: "list>page", from: "list", to: "page" },
  { id: "click>save", from: "click", to: "save" },
]

describe("neighbourhoodOf", () => {
  it("holds a node, the nodes one connection away and the connections between them", () => {
    const { nodeIds, edgeIds } = neighbourhoodOf(CONNECTIONS, "page")

    expect([...nodeIds].sort()).toStrictEqual(["list", "page", "visit"])
    expect([...edgeIds].sort()).toStrictEqual(["list>page", "page>list", "visit>page"])
  })

  it("is empty when no node is given", () => {
    expect(neighbourhoodOf(CONNECTIONS, null).nodeIds.size).toBe(0)
  })
})

describe("downstreamOf", () => {
  it("holds every node a node leads to, through a cycle, and none another node leads to", () => {
    expect([...downstreamOf(CONNECTIONS, ["visit"])].sort()).toStrictEqual(["list", "page", "visit"])
  })
})

describe("pathFrom", () => {
  it("holds every node a node leads to and the connections between them", () => {
    const { nodeIds, edgeIds } = pathFrom(CONNECTIONS, "visit")

    expect([...nodeIds].sort()).toStrictEqual(["list", "page", "visit"])
    expect([...edgeIds].sort()).toStrictEqual(["list>page", "page>list", "visit>page"])
  })
})

describe("hiddenBehind", () => {
  const sharedConnections: readonly Connection[] = [...CONNECTIONS, { id: "click>list", from: "click", to: "list" }]

  it("holds the nodes only the hidden sources lead to, and never a source", () => {
    expect([...hiddenBehind(sharedConnections, ["click"], ["visit"])].sort()).toStrictEqual(["save"])
    expect([...hiddenBehind(sharedConnections, ["click", "visit"], [])].sort()).toStrictEqual(["list", "page", "save"])
  })

  it("holds nothing when no source is hidden", () => {
    expect(hiddenBehind(sharedConnections, [], ["click", "visit"]).size).toBe(0)
  })
})

describe("sourcesLeadingTo", () => {
  it("keeps the sources a node can be reached from", () => {
    expect(sourcesLeadingTo(CONNECTIONS, ["visit", "click"], "list")).toStrictEqual(["visit"])
  })
})

describe("cutOffBy", () => {
  const branching: readonly Connection[] = [
    { id: "visit>page", from: "visit", to: "page" },
    { id: "page>list", from: "page", to: "list" },
    { id: "list>row", from: "list", to: "row" },
    { id: "page>row", from: "page", to: "row" },
    { id: "list>price", from: "list", to: "price" },
  ]

  it("holds a collapsed node and the nodes only it leads to, and not one another path still reaches", () => {
    expect([...cutOffBy(branching, ["list"], ["visit"])].sort()).toStrictEqual(["list", "price"])
  })

  it("holds nothing when no node is collapsed", () => {
    expect(cutOffBy(branching, [], ["visit"]).size).toBe(0)
  })
})

describe("lineageOf", () => {
  it("holds a node, every node that leads to it and every node it leads to, and no node beside its path", () => {
    const connections: readonly Connection[] = [
      { id: "visit>page", from: "visit", to: "page" },
      { id: "page>list", from: "page", to: "list" },
      { id: "page>filter", from: "page", to: "filter" },
      { id: "filter>store", from: "filter", to: "store" },
    ]

    expect([...lineageOf(connections, "filter")].sort()).toStrictEqual(["filter", "page", "store", "visit"])
  })
})
