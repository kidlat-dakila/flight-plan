import { fireEvent, render, screen, within } from "@testing-library/react"
import SectionWriteUpsField from "@/components/SectionWriteUpsField"

const DEFAULTS = {
  context: "always",
  traceDiagram: "always",
  blastDiagram: "on-demand",
  walkthrough: "on-demand",
  findings: "always",
} as const

const renderField = (onChange = vi.fn()) =>
  render(
    <>
      <h3 id="write-ups">Write-ups</h3>
      <SectionWriteUpsField labelledBy="write-ups" value={DEFAULTS} onChange={onChange} />
    </>,
  )

describe("SectionWriteUpsField", () => {
  it("draws a checkbox per part, in the order of a review, ticked where the agent always writes it", () => {
    renderField()

    const checkboxes = within(screen.getByRole("group", { name: "Write-ups" })).getAllByRole<HTMLInputElement>("checkbox")
    expect(checkboxes.map((checkbox) => [checkbox.closest("label")?.textContent, checkbox.checked])).toStrictEqual([
      ["Context", true],
      ["Trace Diagram", true],
      ["Blast Diagram", false],
      ["Code Walkthrough", false],
      ["Findings", true],
    ])
  })

  it("makes a ticked part always written and an unticked one on demand, changing only that part", () => {
    const onChange = vi.fn()
    renderField(onChange)

    fireEvent.click(screen.getByRole("checkbox", { name: "Code Walkthrough" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Findings" }))

    expect(onChange.mock.calls).toStrictEqual([
      [{ ...DEFAULTS, walkthrough: "always" }],
      [{ ...DEFAULTS, findings: "on-demand" }],
    ])
  })
})
