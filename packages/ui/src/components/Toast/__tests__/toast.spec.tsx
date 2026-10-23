import { fireEvent, render, screen } from "@testing-library/react"
import Toast from "@/components/Toast"

describe("Toast", () => {
  it("announces its message, and stays silent without one", () => {
    const { rerender } = render(<Toast message={null} />)

    expect(screen.getByRole("status").textContent).toBe("")

    rerender(<Toast message="Reference copied" />)

    expect(screen.getByRole("status").textContent).toBe("Reference copied")
  })

  it("offers to troubleshoot a failure", () => {
    const onTroubleshoot = vi.fn()
    render(<Toast message="The forge refused the review." onTroubleshoot={onTroubleshoot} />)

    fireEvent.click(screen.getByRole("button", { name: "Troubleshoot" }))

    expect(screen.getByRole("status").textContent).toContain("The forge refused the review.")
    expect(onTroubleshoot).toHaveBeenCalledTimes(1)
  })
})
