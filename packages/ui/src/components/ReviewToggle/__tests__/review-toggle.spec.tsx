import { fireEvent, render, screen } from "@testing-library/react"
import ReviewToggle from "@/components/ReviewToggle"

describe("ReviewToggle", () => {
  it("says whether it is reviewed and asks for the opposite when pressed", () => {
    const onChange = vi.fn()
    const { rerender } = render(<ReviewToggle label="Reviewed" isReviewed={false} onChange={onChange} />)

    const toggle = screen.getByRole("button", { name: "Reviewed" })

    expect(toggle.getAttribute("aria-pressed")).toBe("false")

    fireEvent.click(toggle)

    expect(onChange).toHaveBeenLastCalledWith(true)

    rerender(<ReviewToggle label="Reviewed" isReviewed onChange={onChange} />)
    fireEvent.click(toggle)

    expect(toggle.getAttribute("aria-pressed")).toBe("true")
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it("cannot be pressed while a change is being stored", () => {
    render(<ReviewToggle label="Reviewed" isReviewed={false} isDisabled onChange={vi.fn()} />)

    expect(screen.getByRole("button", { name: "Reviewed" })).toHaveProperty("disabled", true)
  })
})
