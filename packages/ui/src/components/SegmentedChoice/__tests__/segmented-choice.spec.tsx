import { fireEvent, render, screen } from "@testing-library/react"
import SegmentedChoice from "@/components/SegmentedChoice"

const OPTIONS = [
  { value: "default", label: "Default" },
  { value: "low", label: "Low" },
  { value: "high", label: "High" },
]

describe("SegmentedChoice", () => {
  it("shows a labelled group with one step per option and the chosen one ticked", () => {
    render(<SegmentedChoice label="Effort for Claude" options={OPTIONS} value="low" onChange={vi.fn()} />)

    expect(screen.getByRole("group", { name: "Effort for Claude" })).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Low" }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Default" }).checked).toBe(false)
    expect(screen.getAllByRole("radio")).toHaveLength(3)
  })

  it("reports the step the user picks", () => {
    const onChange = vi.fn()
    render(<SegmentedChoice label="Effort for Claude" options={OPTIONS} value="low" onChange={onChange} />)

    fireEvent.click(screen.getByRole("radio", { name: "High" }))

    expect(onChange).toHaveBeenCalledWith("high")
  })
})
