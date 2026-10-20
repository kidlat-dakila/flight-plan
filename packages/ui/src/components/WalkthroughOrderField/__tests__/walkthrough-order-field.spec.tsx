import { fireEvent, render, screen } from "@testing-library/react"
import WalkthroughOrderField from "@/components/WalkthroughOrderField"

describe("WalkthroughOrderField", () => {
  it("shows the saved order with its example on a button that opens the three orders", async () => {
    render(<WalkthroughOrderField value="imports-top-down" onChange={vi.fn()} />)

    const trigger = screen.getByRole("button", { name: "Code Walkthrough order, Entry points first" })
    expect(trigger.textContent).toBe("Entry points firstStart where the change is used, like pages and routes, then follow it down to the details.")

    fireEvent.click(trigger)

    expect((await screen.findAllByRole("radio")).map((radio) => radio.closest("label")?.querySelector(".font-bold")?.textContent)).toStrictEqual([
      "Building blocks first",
      "Entry points first",
      "Most important first",
    ])
    expect(screen.getByRole<HTMLInputElement>("radio", { name: /Entry points first/ }).checked).toBe(true)
    expect(screen.getByText(/Start with the files the rest of the change depends on/)).toBeTruthy()
  })

  it("gives the order the user chooses", async () => {
    const onChange = vi.fn()
    render(<WalkthroughOrderField value="imports-bottom-up" onChange={onChange} />)

    fireEvent.click(screen.getByRole("button", { name: "Code Walkthrough order, Building blocks first" }))
    fireEvent.click(await screen.findByRole("radio", { name: /Most important first/ }))
    fireEvent.click(screen.getByRole("button", { name: "Choose" }))

    expect(onChange).toHaveBeenCalledWith("important-first")
  })
})
