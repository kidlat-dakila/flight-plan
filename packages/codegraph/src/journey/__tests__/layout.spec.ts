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
  it("places the nodes top to bottom in the order the code runs, inside the board", () => {
    const layout = layoutJourney(flow)
    const [click, route, price] = layout.nodes

    expect(click.y + click.height).toBeLessThan(route.y)
    expect(route.y + route.height).toBeLessThan(price.y)
    expect(price.y + price.height).toBeLessThanOrEqual(layout.height)
    expect(price.x + price.width).toBeLessThanOrEqual(layout.width)
  })

  it("routes each edge from its upper node to its lower node", () => {
    const [trigger, value] = layoutJourney(flow).edges

    expect(trigger.points.length).toBeGreaterThan(1)
    expect(value.points[0].y).toBeLessThan(value.labelPoint.y)
  })
})
