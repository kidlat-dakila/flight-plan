import { fireEvent, render, screen, within } from "@testing-library/react"
import DiagramNodePanel from "@/components/DiagramNodePanel"
import { CODE_LINKS } from "@/lib/__tests__/review-samples"

describe("DiagramNodePanel", () => {
  it("shows the node's name, kind, detail and code, and reports a close", () => {
    const onClose = vi.fn()
    render(
      <DiagramNodePanel title="Price of a line" kindLabel="Logic" target={CODE_LINKS["src/price.ts#priceOf"]} onClose={onClose}>
        <p>Subtracts the held units.</p>
      </DiagramNodePanel>,
    )
    const panel = screen.getByRole("region", { name: "Price of a line" })

    expect(within(panel).getByText("Logic")).toBeTruthy()
    expect(within(panel).getByText("Subtracts the held units.")).toBeTruthy()
    expect(within(panel).getByText("src/price.ts")).toBeTruthy()
    expect(within(panel).getByRole("link", { name: "Open on GitHub" })).toBeTruthy()

    fireEvent.click(within(panel).getByRole("button", { name: "Close the code panel" }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("has no code part for a node without code", () => {
    render(<DiagramNodePanel title="Customer clicks Checkout" kindLabel="Entry point" target={null} onClose={vi.fn()}>{null}</DiagramNodePanel>)

    expect(screen.queryByRole("group")).toBeNull()
  })
})
