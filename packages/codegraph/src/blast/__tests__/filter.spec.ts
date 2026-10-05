import { deriveShields, filterBlast } from "@/blast/filter"
import type { DiagramSettings } from "@/journey/filter"
import type { Blast, BlastEdge, BlastNode } from "@flightplan/configurations"

const EVERYTHING: DiagramSettings = { levels: null, isShowingData: true, isShowingAssumed: true }

const node = (id: string, ring: number, verdict: BlastNode["verdict"] = null): BlastNode => ({
  id,
  ring,
  path: `src/${id}.ts`,
  declaration: id,
  label: id,
  contract: null,
  verdict,
  effect: null,
})

const edge = (from: string, to: string, overrides: Partial<BlastEdge> = {}): BlastEdge => ({
  from,
  to,
  kind: "call",
  certainty: "proven",
  ...overrides,
})

const blast: Blast = {
  nodes: [
    node("price", 0),
    node("report", 1, "unaffected"),
    node("checkout", 1, "breaks"),
    node("badge", 1),
    node("table", 2),
    node("route", 2),
    node("page", 3),
  ],
  edges: [
    edge("report", "price"),
    edge("checkout", "price"),
    edge("badge", "price", { kind: "data", certainty: "assumed" }),
    edge("table", "report"),
    edge("route", "checkout"),
    edge("page", "table"),
  ],
}

const idsOf = (filtered: Blast): string[] => filtered.nodes.map((shown) => shown.id)

describe("filterBlast", () => {
  it("keeps every node when every setting is on", () => {
    expect(idsOf(filterBlast(blast, EVERYTHING))).toStrictEqual(idsOf(blast))
  })

  it("cuts the rings beyond the chosen one", () => {
    expect(idsOf(filterBlast(blast, { ...EVERYTHING, levels: 1 }))).toStrictEqual(["price", "report", "checkout", "badge"])
    expect(idsOf(filterBlast(blast, { ...EVERYTHING, levels: 0 }))).toStrictEqual(["price"])
  })

  it("hides a node reached only through a hidden connection", () => {
    expect(idsOf(filterBlast(blast, { ...EVERYTHING, isShowingData: false }))).not.toContain("badge")
    expect(idsOf(filterBlast(blast, { ...EVERYTHING, isShowingAssumed: false }))).not.toContain("badge")
  })
})

describe("deriveShields", () => {
  it("records the unaffected node that stops the change, for every node beyond it", () => {
    const shields = deriveShields(blast)

    expect(shields.get("table")?.id).toBe("report")
    expect(shields.get("page")?.id).toBe("report")
  })

  it("leaves a node unshielded when the change still reaches it", () => {
    const shields = deriveShields(blast)

    expect(shields.has("route")).toBe(false)
    expect(shields.has("report")).toBe(false)
    expect(shields.has("price")).toBe(false)
  })
})
