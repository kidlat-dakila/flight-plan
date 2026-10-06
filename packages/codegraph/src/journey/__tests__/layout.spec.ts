import { createDeclarationNode } from "@/__tests__/review-fixture"
import { layoutJourney } from "@/journey/layout"
import type { JourneyFlow } from "@flightplan/configurations"

const flow: JourneyFlow = {
  id: "flow",
  title: "Flow",
  nodes: [
    { kind: "entry-point", id: "click", label: "Click", description: null },
    createDeclarationNode("route"),
    createDeclarationNode("price", { isChanged: true }),
  ],
  edges: [
    { from: "click", to: "route", kind: "trigger", certainty: "proven" },
    { from: "route", to: "price", kind: "value", certainty: "assumed" },
  ],
}

describe("layoutJourney", () => {
  it("places the nodes left to right in the order the code runs, inside the board", () => {
    const layout = layoutJourney(flow)
    const [click, route, price] = layout.nodes

    expect(click.x + click.width).toBeLessThan(route.x)
    expect(route.x + route.width).toBeLessThan(price.x)
    expect(price.x + price.width).toBeLessThanOrEqual(layout.width)
    expect(price.y + price.height).toBeLessThanOrEqual(layout.height)
  })

  it("routes each edge from its left node to its right node", () => {
    const [trigger, value] = layoutJourney(flow).edges

    expect(trigger.points.length).toBeGreaterThan(1)
    expect(value.points[0].x).toBeLessThan(value.labelPoint.x)
  })
})
