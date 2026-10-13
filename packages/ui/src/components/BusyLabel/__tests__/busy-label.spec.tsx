import { render, screen } from "@testing-library/react"
import BusyLabel from "@/components/BusyLabel"

describe("BusyLabel", () => {
  it("announces what is underway", () => {
    render(<BusyLabel label="Downloading…" />)

    expect(screen.getByRole("status").textContent).toBe("Downloading…")
  })
})
