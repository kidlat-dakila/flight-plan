import { render, screen } from "@testing-library/react"
import InfoCallout from "@/components/InfoCallout"

describe("InfoCallout", () => {
  it("shows its title and text as a note, not an alert", () => {
    render(<InfoCallout title="Good to know">Flight Plan keeps everything on this machine.</InfoCallout>)

    const note = screen.getByRole("note")
    expect(note.textContent).toContain("Good to know")
    expect(note.textContent).toContain("Flight Plan keeps everything on this machine.")
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
