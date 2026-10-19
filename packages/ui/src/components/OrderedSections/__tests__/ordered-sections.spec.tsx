import { render, screen } from "@testing-library/react"
import OrderedSections from "@/components/OrderedSections"

describe("OrderedSections", () => {
  it("draws the sections in the order it is given, and only those", () => {
    render(
      <OrderedSections
        order={["walkthrough", "context"]}
        sections={{ context: <h2>Context</h2>, walkthrough: <h2>Code Walkthrough</h2>, blastDiagram: <h2>Blast Diagram</h2> }}
      />,
    )

    expect(screen.getAllByRole("heading").map((heading) => heading.textContent)).toStrictEqual(["Code Walkthrough", "Context"])
  })
})
