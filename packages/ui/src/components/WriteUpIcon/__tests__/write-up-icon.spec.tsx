import { render, screen } from "@testing-library/react"
import { NoWriteUpTag, WriteUpOffer } from "@/components/WriteUpIcon"

describe("WriteUpIcon", () => {
  it("draws skeleton lines in place of the tag and the button while the part is being written", () => {
    const offer = { hint: "Adds a function.", label: "The agent is explaining this card.", buttonLabel: "Explain this card", onWriteUp: vi.fn() }
    const { container } = render(<WriteUpOffer {...offer} isBeingWritten />)

    expect(container.querySelector("[data-unwritten]")).not.toBeNull()
    expect(screen.getByText("The agent is explaining this card.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Explain this card/ })).toBeNull()
  })

  it("offers the write-up beside the tag while nothing is being written", () => {
    const offer = { hint: null, label: "Not explained yet.", buttonLabel: "Explain this card", onWriteUp: vi.fn() }
    const { container } = render(<WriteUpOffer {...offer} isBeingWritten={false} />)

    expect(container.querySelector("[data-unwritten]")).toBeNull()
    expect(screen.getByRole("button", { name: /Explain this card/ })).toBeTruthy()
  })

  it("is decorative, and the tag beside it carries the label", () => {
    const { container } = render(<NoWriteUpTag label="Not explained yet" />)

    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
    expect(screen.getByText("Not explained yet")).toBeTruthy()
  })
})
