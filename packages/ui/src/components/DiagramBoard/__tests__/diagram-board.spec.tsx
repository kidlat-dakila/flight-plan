import { fireEvent, render, screen } from "@testing-library/react"
import DiagramBoard from "@/components/DiagramBoard"

const renderBoard = (isFullScreen: boolean, onFullScreenChange = vi.fn()) =>
  render(
    <DiagramBoard label="A checkout" width={400} height={300} isFullScreen={isFullScreen} panel={<p>Node detail</p>} onFullScreenChange={onFullScreenChange}>
      <p>Board content</p>
    </DiagramBoard>,
  )

describe("DiagramBoard", () => {
  it("draws its content at its natural size and zooms in steps", () => {
    renderBoard(false)

    const content = screen.getByText("Board content").parentElement

    expect(content?.style.transform).toBe("scale(1)")

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))

    expect(content?.style.transform).toBe("scale(1.25)")

    fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }))

    expect(content?.style.transform).toBe("scale(1)")
  })

  it("asks to go full screen, and only then shows the side panel", async () => {
    const onFullScreenChange = vi.fn()
    const { rerender } = renderBoard(false, onFullScreenChange)

    expect(screen.queryByText("Node detail")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Full screen" }))

    expect(onFullScreenChange).toHaveBeenCalledWith(true)

    rerender(
      <DiagramBoard label="A checkout" width={400} height={300} isFullScreen panel={<p>Node detail</p>} onFullScreenChange={onFullScreenChange}>
        <p>Board content</p>
      </DiagramBoard>,
    )

    expect(await screen.findByText("Node detail")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Leave full screen" })).toBeTruthy()
  })
})
