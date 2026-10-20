import { render, screen } from "@testing-library/react"
import WriteUpIcon, { NoWriteUpTag } from "@/components/WriteUpIcon"

describe("WriteUpIcon", () => {
  it("spins only while the part is being written", () => {
    const still = render(<WriteUpIcon isBeingWritten={false} />).container.querySelector("svg")
    const spinning = render(<WriteUpIcon isBeingWritten />).container.querySelector("svg")

    expect(still?.getAttribute("class")).not.toContain("animate-spin")
    expect(spinning?.getAttribute("class")).toContain("animate-spin")
  })

  it("is decorative, and the tag beside it carries the label", () => {
    const { container } = render(<NoWriteUpTag label="No write-up yet" />)

    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
    expect(screen.getByText("No write-up yet")).toBeTruthy()
  })
})
