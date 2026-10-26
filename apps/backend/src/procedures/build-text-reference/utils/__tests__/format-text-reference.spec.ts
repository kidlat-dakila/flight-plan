import { formatTextReference } from "@/procedures/build-text-reference/utils/format-text-reference"

const QUOTE = "rounds the total once"

describe("formatTextReference", () => {
  it("names the review artifact when the text belongs to no part of it", () => {
    expect(formatTextReference({ kind: "review" }, QUOTE)).toBe("the review artifact, where it says \"rounds the total once\"")
  })

  it("names each part of the review artifact by its id", () => {
    expect([
      formatTextReference({ kind: "segment", segmentId: "all" }, QUOTE),
      formatTextReference({ kind: "waypoint", waypointId: "w2" }, QUOTE),
      formatTextReference({ kind: "trace-diagram", segmentId: "all" }, QUOTE),
      formatTextReference({ kind: "trace-node", segmentId: "all", nodeId: "j-subtotal" }, QUOTE),
      formatTextReference({ kind: "blast-node", segmentId: "all", path: "src/cart/CartPage.tsx" }, QUOTE),
      formatTextReference({ kind: "context-code-block", blockId: "b-subtotal" }, QUOTE),
    ]).toStrictEqual([
      "segment `all` of the review artifact, where it says \"rounds the total once\"",
      "waypoint `w2` of the review artifact, where it says \"rounds the total once\"",
      "the Trace Diagram of segment `all`, where it says \"rounds the total once\"",
      "Trace Diagram node `j-subtotal` of segment `all`, where it says \"rounds the total once\"",
      "Blast Diagram file `src/cart/CartPage.tsx` of segment `all`, where it says \"rounds the total once\"",
      "context code block `b-subtotal` of the review artifact, where it says \"rounds the total once\"",
    ])
  })

  it("quotes the text on one line, with each run of whitespace made one space", () => {
    expect(formatTextReference({ kind: "review" }, " rounds\n\n  the total\tonce ")).toBe("the review artifact, where it says \"rounds the total once\"")
  })
})
