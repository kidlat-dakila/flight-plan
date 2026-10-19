import { fireEvent, render, screen } from "@testing-library/react"
import WalkthroughOrderField from "@/components/WalkthroughOrderField"

describe("WalkthroughOrderField", () => {
  it("offers the three orders with an example, the saved one ticked", () => {
    render(<WalkthroughOrderField value="imports-top-down" onChange={vi.fn()} />)

    expect(screen.getByRole("group", { name: "Code Walkthrough order" })).toBeTruthy()
    expect(screen.getAllByRole("radio").map((radio) => radio.nextElementSibling?.textContent)).toStrictEqual([
      "Bottom up",
      "Top down",
      "Important changes first",
    ])
    expect(screen.getByRole<HTMLInputElement>("radio", { name: /Top down/ }).checked).toBe(true)
    expect(screen.getByText(/the walkthrough reads a\.ts, b\.ts, c\.ts\./)).toBeTruthy()
  })

  it("gives the order the user picks", () => {
    const onChange = vi.fn()
    render(<WalkthroughOrderField value="imports-bottom-up" onChange={onChange} />)

    fireEvent.click(screen.getByRole("radio", { name: /Important changes first/ }))

    expect(onChange).toHaveBeenCalledWith("important-first")
  })
})
