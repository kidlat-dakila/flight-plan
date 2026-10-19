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
  it("asks Always or On demand for each part, in the order of a review, with the saved choice ticked", () => {
    renderField()

    const field = screen.getByRole("group", { name: "Write-ups" })
    expect(within(field).getAllByRole("group").map((choice) => choice.querySelector("legend")?.textContent)).toStrictEqual([
      "Context",
      "Trace Diagram",
      "Blast Diagram",
      "Code Walkthrough",
      "Findings",
    ])
    const blastDiagram = within(field).getByRole("group", { name: "Blast Diagram" })
    expect(within(blastDiagram).getByRole<HTMLInputElement>("radio", { name: "On demand" }).checked).toBe(true)
    expect(within(blastDiagram).getByRole<HTMLInputElement>("radio", { name: "Always" }).checked).toBe(false)
  })

  it("changes only the part the user answers", () => {
    const onChange = vi.fn()
    renderField(onChange)

    fireEvent.click(within(screen.getByRole("group", { name: "Code Walkthrough" })).getByRole("radio", { name: "Always" }))

    expect(onChange).toHaveBeenCalledWith({ ...DEFAULTS, walkthrough: "always" })
  })
})
