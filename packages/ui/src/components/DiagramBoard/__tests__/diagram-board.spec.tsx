import { fireEvent, render, screen, within } from "@testing-library/react"
import DiagramBoard, { type BoardNavigation } from "@/components/DiagramBoard"
import { findNavigator, findNavigatorButton, navigatorLabels, renderInNavigator, SECTION_ANCHOR_ID } from "@/lib/__tests__/navigator-harness"
import { navigatorButtonOf } from "@/lib/navigator-controls"

const NAVIGATION: BoardNavigation = { anchorId: SECTION_ANCHOR_ID, leadingGroup: [] }

const renderBoard = (isFullScreen: boolean, onFullScreenChange = vi.fn()) =>
  render(
    <DiagramBoard label="A checkout" width={400} height={300} isFullScreen={isFullScreen} panel={<p>Node detail</p>} onFullScreenChange={onFullScreenChange} onPanelClose={vi.fn()}>
      <p>Board content</p>
    </DiagramBoard>,
  )

const boardInNavigator = (isFullScreen: boolean, onFullScreenChange = vi.fn()) => (
  <DiagramBoard
    label="A checkout"
    width={400}
    height={300}
    isFullScreen={isFullScreen}
    panel={<p>Node detail</p>}
    navigation={NAVIGATION}
    onFullScreenChange={onFullScreenChange}
    onPanelClose={vi.fn()}
  >
    <p>Board content</p>
  </DiagramBoard>
)

describe("DiagramBoard", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("draws its content at its natural size, and zooms in steps from the navigator", async () => {
    renderInNavigator(boardInNavigator(false))

    const content = screen.getByText("Board content").parentElement

    expect(content?.style.transform).toBe("scale(1)")

    fireEvent.click(await findNavigatorButton("Zoom in"))

    expect(content?.style.transform).toBe("scale(1.25)")

    fireEvent.click(await findNavigatorButton("Reset view"))

    expect(content?.style.transform).toBe("scale(1)")
  })

  it("hands its zoom and its pan to a canvas that draws itself, and takes the pan that canvas reports", async () => {
    renderInNavigator(
      <DiagramBoard
        label="A checkout"
        width={400}
        height={300}
        isFullScreen={false}
        panel={null}
        navigation={NAVIGATION}
        renderCanvas={({ zoom, offset, onPan }) => (
          <button type="button" onClick={() => { onPan({ x: offset.x + 30, y: offset.y + 20 }) }}>
            {`Zoom ${String(zoom)} at ${String(offset.x)}, ${String(offset.y)}`}
          </button>
        )}
        onFullScreenChange={vi.fn()}
        onPanelClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Zoom 1 at 0, 0" }))
    fireEvent.click(await findNavigatorButton("Zoom in"))

    expect(screen.getByRole("button", { name: "Zoom 1.25 at 30, 20" })).toBeTruthy()

    fireEvent.click(await findNavigatorButton("Reset view"))

    expect(screen.getByRole("button", { name: "Zoom 1 at 0, 0" })).toBeTruthy()
  })

  it("gives the navigator the controls it is handed, then zoom in, zoom out, full screen and reset view", async () => {
    renderInNavigator(
      <DiagramBoard
        label="A checkout"
        width={400}
        height={300}
        isFullScreen={false}
        panel={null}
        navigation={{ anchorId: SECTION_ANCHOR_ID, leadingGroup: [navigatorButtonOf({ key: "q", label: "Collapse all", onRun: vi.fn() })] }}
        onFullScreenChange={vi.fn()}
        onPanelClose={vi.fn()}
      >
        <p>Board content</p>
      </DiagramBoard>,
    )

    expect(await navigatorLabels("Zoom in")).toStrictEqual(["Jump to", "Collapse all", "Zoom in", "Zoom out", "Full screen", "Reset view"])
  })

  it("keeps the author's actions on a toolbar of its own and adds no view button to it", () => {
    render(
      <DiagramBoard
        label="A checkout"
        width={400}
        height={300}
        isFullScreen={false}
        panel={null}
        actions={<button type="button" aria-label="Add a card" />}
        onFullScreenChange={vi.fn()}
        onPanelClose={vi.fn()}
      >
        <p>Board content</p>
      </DiagramBoard>,
    )

    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toStrictEqual(["Add a card"])
  })

  it("draws no toolbar when it is handed no actions", () => {
    renderBoard(false)

    expect(screen.queryAllByRole("button")).toStrictEqual([])
  })

  it("moves its content with a drag, swallows the click that ends it, and puts the content back on reset", async () => {
    const onContentClick = vi.fn()
    renderInNavigator(
      <DiagramBoard label="A checkout" width={400} height={300} isFullScreen={false} panel={null} navigation={NAVIGATION} onFullScreenChange={vi.fn()} onPanelClose={vi.fn()}>
        <button type="button" onClick={onContentClick}>Node</button>
      </DiagramBoard>,
    )
    const node = screen.getByRole("button", { name: "Node" })
    const transformOf = () => screen.getByRole("group", { name: "A checkout" }).firstElementChild?.getAttribute("style")

    fireEvent.pointerDown(node, { button: 0, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(window, { clientX: 140, clientY: 70 })
    fireEvent.pointerUp(window, { clientX: -5000 })
    fireEvent.click(node)

    expect(transformOf()).toContain("translate(40px, -30px)")
    expect(onContentClick).not.toHaveBeenCalled()

    fireEvent.click(node)
    fireEvent.click(await findNavigatorButton("Reset view"))

    expect(onContentClick).toHaveBeenCalledTimes(1)
    expect(transformOf()).toContain("translate(0px, 0px)")
  })

  it("asks to go full screen from the navigator, and then shows the navigator and the side panel over the board", async () => {
    const onFullScreenChange = vi.fn()
    const view = renderInNavigator(boardInNavigator(false, onFullScreenChange))

    expect(screen.queryByText("Node detail")).toBeNull()

    fireEvent.click(await findNavigatorButton("Full screen"))

    expect(onFullScreenChange).toHaveBeenCalledWith(true)

    view.rerender(boardInNavigator(true, onFullScreenChange))

    expect(await screen.findByText("Node detail")).toBeTruthy()
    const leave = await within(await screen.findByRole("dialog", { name: "A checkout" })).findByRole("button", { name: "Leave full screen" })
    expect(leave.getAttribute("aria-pressed")).toBe("true")
    expect(screen.getAllByRole("toolbar", { name: "Review navigator" })).toHaveLength(1)
    expect(await findNavigator()).toBeTruthy()
  })

  it("lets the side panel be made wider and narrower with the arrow keys, and gives it back its own width on a double click", async () => {
    renderBoard(true)
    const panel = (await screen.findByText("Node detail")).parentElement
    const handle = screen.getByRole("slider", { name: "Side panel width" })

    expect(panel?.style.width).toBe("")

    fireEvent.keyDown(handle, { key: "ArrowLeft" })
    fireEvent.keyDown(handle, { key: "ArrowLeft" })
    const widened = Number.parseInt(panel?.style.width ?? "", 10)

    fireEvent.keyDown(handle, { key: "ArrowRight" })

    expect(widened).toBeGreaterThanOrEqual(320)
    expect(Number.parseInt(panel?.style.width ?? "", 10)).toBeLessThanOrEqual(widened)

    fireEvent.doubleClick(handle)

    expect(panel?.style.width).toBe("")
  })

  it("follows the pointer while the side panel's edge is dragged, and never past four fifths of the window", async () => {
    renderBoard(true)
    const panel = (await screen.findByText("Node detail")).parentElement
    const handle = screen.getByRole("slider", { name: "Side panel width" })

    fireEvent.pointerDown(handle, { button: 0, clientX: 600 })
    fireEvent.pointerMove(window, { clientX: -5000 })
    fireEvent.pointerUp(window, { clientX: -5000 })

    expect(panel?.style.width).toBe(`${String(Math.round(window.innerWidth * 0.8))}px`)
  })

  it("shows no resize handle while no panel is open", () => {
    render(
      <DiagramBoard label="A checkout" width={400} height={300} isFullScreen panel={null} onFullScreenChange={vi.fn()} onPanelClose={vi.fn()}>
        <p>Board content</p>
      </DiagramBoard>,
    )

    expect(screen.queryByRole("slider")).toBeNull()
  })

  it("opens the side panel at the width the reviewer left it at, kept in the browser under the layout key", async () => {
    const first = renderBoard(true)
    fireEvent.keyDown(screen.getByRole("slider", { name: "Side panel width" }), { key: "ArrowLeft" })
    const chosen = (await screen.findByText("Node detail")).parentElement?.style.width ?? ""
    first.unmount()

    renderBoard(true)

    expect(chosen).not.toBe("")
    expect((await screen.findByText("Node detail")).parentElement?.style.width).toBe(chosen)
    expect(JSON.parse(window.localStorage.getItem("flight-plan:layout:v1") ?? "{}")).toStrictEqual({ diagramPanelWidthPx: Number.parseInt(chosen, 10) })
  })

  it("opens the side panel at its own width when what the browser kept cannot be read", async () => {
    window.localStorage.setItem("flight-plan:layout:v1", "not json")

    renderBoard(true)

    expect((await screen.findByText("Node detail")).parentElement?.style.width).toBe("")
  })
})
