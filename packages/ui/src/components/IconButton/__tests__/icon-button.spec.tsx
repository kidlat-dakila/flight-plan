import { fireEvent, render, screen } from "@testing-library/react"
import IconButton from "@/components/IconButton"

describe("IconButton", () => {
  it("is named by its label and reports a press", () => {
    const onClick = vi.fn()
    render(<IconButton icon="next" label="Next waypoint" onClick={onClick} />)

    fireEvent.click(screen.getByRole("button", { name: "Next waypoint" }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("cannot be pressed while disabled", () => {
    render(<IconButton icon="next" label="Next waypoint" isDisabled onClick={vi.fn()} />)

    expect(screen.getByRole("button", { name: "Next waypoint" })).toHaveProperty("disabled", true)
  })

  it("can be the settings gear", () => {
    render(<IconButton icon="settings" label="Configure storefront" onClick={vi.fn()} />)

    expect(screen.getByRole("button", { name: "Configure storefront" }).getAttribute("title")).toBe("Configure storefront")
  })
})
