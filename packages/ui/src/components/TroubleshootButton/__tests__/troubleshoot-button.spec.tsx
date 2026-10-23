import { fireEvent, render, screen } from "@testing-library/react"
import TroubleshootButton from "@/components/TroubleshootButton"

describe("TroubleshootButton", () => {
  it("asks for troubleshooting when pressed", () => {
    const onClick = vi.fn()
    render(<TroubleshootButton onClick={onClick} />)

    fireEvent.click(screen.getByRole("button", { name: "Troubleshoot" }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
