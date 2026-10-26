import { artifactPartMark, artifactPartOf, segmentMark } from "@/lib/artifact-part"

const elementOf = (html: string, selector: string): Element => {
  const element = new DOMParser().parseFromString(html, "text/html").body.querySelector(selector)
  if (element === null) throw new Error(`No element matches ${selector}`)
  return element
}

describe("artifact part", () => {
  it("writes the marks as data attributes", () => {
    expect(artifactPartMark("trace-diagram")).toStrictEqual({ "data-artifact-part": "trace-diagram" })
    expect(artifactPartMark("waypoint", "price-of")).toStrictEqual({ "data-artifact-part": "waypoint", "data-artifact-id": "price-of" })
    expect(segmentMark("checkout")).toStrictEqual({ "data-segment-id": "checkout" })
  })

  it("names the part a selection is in, inside its segment", () => {
    const html = `
      <section data-segment-id="checkout">
        <div data-artifact-part="trace-diagram">
          <h2>Placing an order</h2>
          <div data-artifact-part="trace-node" data-artifact-id="cart-line"><span>Adds a line</span></div>
        </div>
        <div data-artifact-part="blast-node" data-artifact-id="src/cart.ts"><span>src/cart.ts</span></div>
      </section>`

    expect(artifactPartOf(elementOf(html, "h2"))).toStrictEqual({ kind: "trace-diagram", segmentId: "checkout" })
    expect(artifactPartOf(elementOf(html, "[data-artifact-id=cart-line] span"))).toStrictEqual({ kind: "trace-node", segmentId: "checkout", nodeId: "cart-line" })
    expect(artifactPartOf(elementOf(html, "[data-artifact-part=blast-node] span"))).toStrictEqual({ kind: "blast-node", segmentId: "checkout", path: "src/cart.ts" })
  })

  it("names a waypoint and a context code block by their id alone, inside a segment or not", () => {
    const html = `
      <section data-segment-id="checkout"><div data-artifact-part="waypoint" data-artifact-id="price-of"><p>Held units</p></div></section>
      <div data-artifact-part="context-code-block" data-artifact-id="block-1"><p>The old flow</p></div>
      <div data-artifact-part="waypoint" data-artifact-id="hold-stock"><p>Holds the stock</p></div>`

    expect(artifactPartOf(elementOf(html, "[data-artifact-id=price-of] p"))).toStrictEqual({ kind: "waypoint", waypointId: "price-of" })
    expect(artifactPartOf(elementOf(html, "[data-artifact-id=block-1] p"))).toStrictEqual({ kind: "context-code-block", blockId: "block-1" })
    expect(artifactPartOf(elementOf(html, "[data-artifact-id=hold-stock] p"))).toStrictEqual({ kind: "waypoint", waypointId: "hold-stock" })
  })

  it("falls back to the review when a part that needs a segment is outside one", () => {
    const html = `<div data-artifact-part="trace-node" data-artifact-id="cart-line"><span>Adds a line</span></div>`

    expect(artifactPartOf(elementOf(html, "span"))).toStrictEqual({ kind: "review" })
  })

  it("falls back to the segment when a part lacks the id it needs", () => {
    const html = `<section data-segment-id="checkout"><div data-artifact-part="trace-node"><span>Adds a line</span></div></section>`

    expect(artifactPartOf(elementOf(html, "span"))).toStrictEqual({ kind: "segment", segmentId: "checkout" })
  })

  it("names the segment for plain text inside it, and the review for text outside every mark", () => {
    const html = `<section data-segment-id="checkout"><p>Why this segment</p></section><header><h1>Review</h1></header>`

    expect(artifactPartOf(elementOf(html, "p"))).toStrictEqual({ kind: "segment", segmentId: "checkout" })
    expect(artifactPartOf(elementOf(html, "h1"))).toStrictEqual({ kind: "review" })
  })
})
