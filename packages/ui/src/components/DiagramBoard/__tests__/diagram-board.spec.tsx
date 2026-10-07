import { fireEvent, render, screen } from "@testing-library/react"
import DiagramBoard from "@/components/DiagramBoard"

const renderBoard = (isFullScreen: boolean, onFullScreenChange = vi.fn()) =>
  render(
    <DiagramBoard label="A checkout" width={400} height={300} isFullScreen={isFullScreen} panel={<p>Node detail</p>} onFullScreenChange={onFullScreenChange} onPanelClose={vi.fn()}>
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

    fireEvent.click(screen.getByRole("button", { name: "Reset view" }))

    expect(content?.style.transform).toBe("scale(1)")
  })

  it("shows the actions it is given before its own buttons", () => {
    render(
      <DiagramBoard
        label="A checkout"
        width={400}
        height={300}
        isFullScreen={false}
        panel={null}
        actions={<button type="button" aria-label="Collapse all" />}
        onFullScreenChange={vi.fn()}
        onPanelClose={vi.fn()}
      >
        <p>Board content</p>
      </DiagramBoard>,
    )

    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label")).slice(0, 2)).toStrictEqual(["Collapse all", "Zoom out"])
  })

  it("has one full screen button", () => {
    renderBoard(false)

    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toStrictEqual(["Zoom out", "Zoom in", "Reset view", "Full screen"])
  })

  it("moves its content with a drag, swallows the click that ends it, and puts the content back on reset", () => {
    const onContentClick = vi.fn()
    render(
      <DiagramBoard label="A checkout" width={400} height={300} isFullScreen={false} panel={null} onFullScreenChange={vi.fn()} onPanelClose={vi.fn()}>
        <button type="button" onClick={onContentClick}>Node</button>
      </DiagramBoard>,
    )
    const node = screen.getByRole("button", { name: "Node" })
    const transformOf = () => screen.getByRole("group", { name: "A checkout" }).firstElementChild?.getAttribute("style")

    fireEvent.pointerDown(node, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(window, { clientX: 140, clientY: 70 })
    fireEvent.pointerUp(window)
    fireEvent.click(node)

    expect(transformOf()).toContain("translate(40px, -30px)")
    expect(onContentClick).not.toHaveBeenCalled()

    fireEvent.click(node)
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }))

    expect(onContentClick).toHaveBeenCalledTimes(1)
    expect(transformOf()).toContain("translate(0px, 0px)")
  })

  it("asks to go full screen, and only then shows the side panel", async () => {
    const onFullScreenChange = vi.fn()
    const { rerender } = renderBoard(false, onFullScreenChange)

    expect(screen.queryByText("Node detail")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Full screen" }))

    expect(onFullScreenChange).toHaveBeenCalledWith(true)

    rerender(
      <DiagramBoard label="A checkout" width={400} height={300} isFullScreen panel={<p>Node detail</p>} onFullScreenChange={onFullScreenChange} onPanelClose={vi.fn()}>
        <p>Board content</p>
      </DiagramBoard>,
    )

    expect(await screen.findByText("Node detail")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Leave full screen" })).toBeTruthy()
  })
})
