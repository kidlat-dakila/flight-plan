import { chosenDiagramOf, listFixtureDiagrams } from "@/app/fixture-diagrams"

const segmentOf = (id: string, heading: string | null, tabs: readonly { readonly id: string, readonly label: string }[] = []) => ({ id, heading, traceDiagram: { tabs } })

const TABBED_PAGE = { segments: [segmentOf("segment-1", null, [{ id: "stock", label: "Stock check" }, { id: "checkout", label: "Checkout" }])] }

const SEGMENTED_PAGE = {
  segments: [
    segmentOf("segment-1", "Segment 1: Stock"),
    segmentOf("segment-2", "Segment 2: Checkout", [{ id: "pay", label: "Pay" }, { id: "ship", label: "Ship" }]),
  ],
}

describe("listFixtureDiagrams", () => {
  it("lists the one diagram of a segment without tabs, labelled by its heading", () => {
    expect(listFixtureDiagrams({ segments: [segmentOf("segment-1", "Segment 1: Stock")] })).toStrictEqual([
      { id: "segment-1", segmentId: "segment-1", tabId: null, label: "Segment 1: Stock" },
    ])
  })

  it("labels a segment without a heading or tabs by its id", () => {
    expect(listFixtureDiagrams({ segments: [segmentOf("segment-1", null)] }).map((diagram) => diagram.label)).toStrictEqual(["segment-1"])
  })

  it("lists every tab of a segment, labelled by the tab when the segment has no heading", () => {
    expect(listFixtureDiagrams(TABBED_PAGE)).toStrictEqual([
      { id: "segment-1/stock", segmentId: "segment-1", tabId: "stock", label: "Stock check" },
      { id: "segment-1/checkout", segmentId: "segment-1", tabId: "checkout", label: "Checkout" },
    ])
  })

  it("lists the diagrams of every segment in order, a tab labelled by its segment's heading and its own label", () => {
    expect(listFixtureDiagrams(SEGMENTED_PAGE).map((diagram) => diagram.label)).toStrictEqual([
      "Segment 1: Stock",
      "Segment 2: Checkout / Pay",
      "Segment 2: Checkout / Ship",
    ])
  })
})

describe("chosenDiagramOf", () => {
  const diagrams = listFixtureDiagrams(SEGMENTED_PAGE)

  it("chooses the diagram of the requested segment and tab", () => {
    expect(chosenDiagramOf(diagrams, "segment-2", "ship")?.id).toBe("segment-2/ship")
  })

  it("falls back to the first diagram of the segment for an unknown tab, and to the first diagram for an unknown segment", () => {
    expect(chosenDiagramOf(diagrams, "segment-2", "missing")?.id).toBe("segment-2/pay")
    expect(chosenDiagramOf(diagrams, "missing", null)?.id).toBe("segment-1")
    expect(chosenDiagramOf(diagrams, null, null)?.id).toBe("segment-1")
  })

  it("chooses nothing from no diagrams", () => {
    expect(chosenDiagramOf([], "segment-1", null)).toBeNull()
  })
})
