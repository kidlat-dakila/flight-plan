import { fireEvent, render, screen, within } from "@testing-library/react"
import DiagramBoard, { type BoardNavigation } from "@/components/DiagramBoard"
import { findNavigatorButton, navigatorLabels, renderInNavigator, SECTION_ANCHOR_ID } from "@/lib/__tests__/navigator-harness"
import { navigatorButtonOf } from "@/lib/navigator-controls"

const NAVIGATION: BoardNavigation = { anchorId: SECTION_ANCHOR_ID, groups: [] }

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

  it("draws its content at its natural size, and zooms in steps with the buttons at its top right", () => {
    renderBoard(false)

    const content = screen.getByText("Board content").parentElement

    expect(content?.style.transform).toBe("scale(1)")

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))

    expect(content?.style.transform).toBe("scale(1.25)")

    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))

    expect(content?.style.transform).toBe("scale(1)")
  })

  it("zooms in on a scroll up over the board and out on a scroll down, and keeps the page from scrolling", () => {
    renderBoard(false)
    const content = screen.getByText("Board content").parentElement
    const board = screen.getByRole("group", { name: "A checkout" })
    const scaleOf = (): number => Number(/scale\((?<scale>[\d.]+)\)/.exec(content?.style.transform ?? "")?.groups?.scale)

    const isScrollingThePage = fireEvent.wheel(board, { deltaY: -100 })
    const zoomedIn = scaleOf()
    fireEvent.wheel(board, { deltaY: 200 })

    expect(isScrollingThePage).toBe(false)
    expect(zoomedIn).toBeGreaterThan(1)
    expect(scaleOf()).toBeLessThan(1)
  })

  it("hands its zoom and its pan to a canvas that draws itself, and takes the pan that canvas reports", () => {
    render(
      <DiagramBoard
        label="A checkout"
        width={400}
        height={300}
        isFullScreen={false}
        panel={null}
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
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))

    expect(screen.getByRole("button", { name: "Zoom 1.25 at 30, 20" })).toBeTruthy()
  })

  it("gives the navigator the controls it is handed, then full screen", async () => {
    renderInNavigator(
      <DiagramBoard
        label="A checkout"
        width={400}
        height={300}
        isFullScreen={false}
        panel={null}
        navigation={{ anchorId: SECTION_ANCHOR_ID, groups: [[navigatorButtonOf({ key: "q", label: "Collapse all", onRun: vi.fn() })]] }}
        onFullScreenChange={vi.fn()}
        onPanelClose={vi.fn()}
      >
        <p>Board content</p>
      </DiagramBoard>,
    )

    expect(await navigatorLabels("Collapse all")).toStrictEqual(["Jump to", "Collapse all", "Full screen"])
  })

  it("puts the author's actions before zoom in, zoom out and full screen on the toolbar at its top right", () => {
    render(
      <DiagramBoard
        label="A checkout"
        width={400}
        height={300}
        isFullScreen={false}
        panel={null}
        actions={<button type="button" aria-label="Remove the selected line" />}
        onFullScreenChange={vi.fn()}
        onPanelClose={vi.fn()}
      >
        <p>Board content</p>
      </DiagramBoard>,
    )

    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toStrictEqual(["Remove the selected line", "Zoom in", "Zoom out", "Full screen"])
  })

  it("draws only zoom in, zoom out and full screen on its toolbar when it is handed no actions", () => {
    renderBoard(false)

    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toStrictEqual(["Zoom in", "Zoom out", "Full screen"])
  })

  it("moves its content with a drag, and swallows the click that ends it", () => {
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
    fireEvent.pointerUp(window, { clientX: -5000 })
    fireEvent.click(node)

    expect(transformOf()).toContain("translate(40px, -30px)")
    expect(onContentClick).not.toHaveBeenCalled()

    fireEvent.click(node)

    expect(onContentClick).toHaveBeenCalledTimes(1)
  })

  it("asks to go full screen from its toolbar, and then shows the navigator and the side panel over the board", async () => {
    const onFullScreenChange = vi.fn()
    const view = renderInNavigator(boardInNavigator(false, onFullScreenChange))

    expect(screen.queryByText("Node detail")).toBeNull()

    fireEvent.click(screen.getAllByRole("button", { name: "Full screen" }).find((button) => button.closest("[role=toolbar]") === null) ?? document.body)

    expect(onFullScreenChange).toHaveBeenCalledWith(true)

    view.rerender(boardInNavigator(true, onFullScreenChange))

    expect(await screen.findByText("Node detail")).toBeTruthy()
    expect(await within(await screen.findByRole("dialog", { name: "A checkout" })).findAllByRole("button", { name: "Leave full screen" })).toHaveLength(2)
    expect(screen.getAllByRole("toolbar", { name: "Review navigator" })).toHaveLength(1)
    expect((await findNavigatorButton("Leave full screen")).getAttribute("aria-pressed")).toBe("true")
  })

  it("puts the focus on the full-screen view itself when it opens, so no button's tooltip shows", async () => {
    renderBoard(true)

    const view = await screen.findByRole("dialog", { name: "A checkout" })

    await vi.waitFor(() => {
      expect(document.activeElement).toBe(view)
    })
  })

  it("goes full screen with F from the navigator", async () => {
    const onFullScreenChange = vi.fn()
    renderInNavigator(boardInNavigator(false, onFullScreenChange))
    await findNavigatorButton("Full screen")

    fireEvent.keyDown(document.body, { key: "f" })

    expect(onFullScreenChange).toHaveBeenCalledWith(true)
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
    expect(JSON.parse(window.localStorage.getItem("flight-plan:layout:v1") ?? "{}")).toStrictEqual({
      diagramPanelWidthPx: Number.parseInt(chosen, 10),
      explorerWidthPx: null,
      sectionsWidthPx: null,
      chatWidthPx: null,
    })
  })

  it("opens the side panel at its own width when what the browser kept cannot be read", async () => {
    window.localStorage.setItem("flight-plan:layout:v1", "not json")

    renderBoard(true)

    expect((await screen.findByText("Node detail")).parentElement?.style.width).toBe("")
  })
})
