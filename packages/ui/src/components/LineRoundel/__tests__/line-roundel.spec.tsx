import { render, screen } from "@testing-library/react"
import LineRoundel from "@/components/LineRoundel"

describe("LineRoundel", () => {
  it("shows the line's letter and hides it from assistive technology", () => {
    render(<LineRoundel label="S" />)

    const letter = screen.getByText("S")

    expect(letter.closest("[aria-hidden='true']")).not.toBeNull()
  })
})
