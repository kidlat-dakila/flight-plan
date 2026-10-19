import { fireEvent, render, screen, within } from "@testing-library/react"
import SectionOrderField from "@/components/SectionOrderField"

const ORDER = ["context", "traceDiagram", "blastDiagram", "walkthrough"] as const

const renderField = (onChange = vi.fn()) =>
  render(
    <>
      <h3 id="arrangement">Display arrangement</h3>
      <SectionOrderField labelledBy="arrangement" value={ORDER} onChange={onChange} />
    </>,
  )

describe("SectionOrderField", () => {
  it("lists the sections in their order, with no way up for the first or down for the last", () => {
    renderField()

    const list = screen.getByRole("list", { name: "Display arrangement" })
    expect(within(list).getAllByRole("listitem").map((item) => item.firstChild?.textContent)).toStrictEqual([
      "Context",
      "Trace Diagram",
      "Blast Diagram",
      "Code Walkthrough",
    ])
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Move Context up" }).disabled).toBe(true)
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Move Code Walkthrough down" }).disabled).toBe(true)
  })

  it("swaps a section with its neighbour", () => {
    const onChange = vi.fn()
    renderField(onChange)

    fireEvent.click(screen.getByRole("button", { name: "Move Blast Diagram up" }))
    fireEvent.click(screen.getByRole("button", { name: "Move Context down" }))

    expect(onChange.mock.calls).toStrictEqual([
      [["context", "blastDiagram", "traceDiagram", "walkthrough"]],
      [["traceDiagram", "context", "blastDiagram", "walkthrough"]],
    ])
  })
})
