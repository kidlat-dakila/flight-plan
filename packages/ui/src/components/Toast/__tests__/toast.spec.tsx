import { render, screen } from "@testing-library/react"
import Toast from "@/components/Toast"

describe("Toast", () => {
  it("announces its message, and stays silent without one", () => {
    const { rerender } = render(<Toast message={null} />)

    expect(screen.getByRole("status").textContent).toBe("")

    rerender(<Toast message="Reference copied" />)

    expect(screen.getByRole("status").textContent).toBe("Reference copied")
  })
})
