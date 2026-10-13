import { fireEvent, render, screen, within } from "@testing-library/react"
import CodeViewEditor, { type CodeViewWaypoint, type WaypointOption } from "@/components/CodeViewEditor"
import type { LineRange } from "@/lib/line-selection"
import type { CodeLine } from "@/lib/review-content"

const PATH = "src/stock/holds.ts"

const toLine = (text: string, index: number): CodeLine => ({
  numberLabel: String(index + 1),
  mark: "context",
  isFocused: false,
  tokens: [{ text, kind: "plain" }],
  marks: [],
  references: [],
})

const LINES: readonly CodeLine[] = ["const first = 1", "const second = 2", "const third = 3", "const fourth = 4"].map(toLine)

const WAYPOINTS: readonly CodeViewWaypoint[] = [
  { id: "active-holds", title: "Counts the holds that are still active", lineStart: 2, lineEnd: 3, attentionLabel: "Needs attention" },
]

interface Setting {
  readonly lines?: readonly CodeLine[] | null
  readonly waypointOptions?: WaypointOption
  readonly focusOn?: LineRange | null
}

const settingOf = (setting: Setting, onHighlightCode: (range: LineRange) => void) => (
  <CodeViewEditor
    path={PATH}
    lines={setting.lines === undefined ? LINES : setting.lines}
    statusMessage="Loading the file…"
    waypoints={WAYPOINTS}
    waypointOptions={setting.waypointOptions ?? "always-off"}
    highlightButtonLabel="Add row"
    focusOn={setting.focusOn ?? null}
    onHighlightCode={onHighlightCode}
  />
)

const renderEditor = (setting: Setting = {}) => {
  const onHighlightCode = vi.fn<(range: LineRange) => void>()
  const view = render(settingOf(setting, onHighlightCode))
  const rerender = (next: Setting) => {
    view.rerender(settingOf(next, onHighlightCode))
  }
  return { onHighlightCode, rerender }
}

describe("CodeViewEditor", () => {
  it("shows every line of the file under its path", () => {
    renderEditor()

    expect(screen.getByText(PATH)).toBeTruthy()
    expect(within(screen.getByRole("group", { name: PATH })).getAllByRole("button", { name: /^Select line/ })).toHaveLength(4)
    expect(screen.getByText("const fourth = 4")).toBeTruthy()
  })

  it("shows the status it is given while it has no lines", () => {
    renderEditor({ lines: null })

    expect(screen.getByRole("status").textContent).toBe("Loading the file…")
  })

  it("hides the waypoints behind a button that shows them, for toggle-off", () => {
    renderEditor({ waypointOptions: "toggle-off" })

    expect(screen.queryByRole("region", { name: "Counts the holds that are still active" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Show waypoints" }))

    const waypoint = screen.getByRole("region", { name: "Counts the holds that are still active" })

    expect(within(waypoint).getByText("Lines 2 to 3")).toBeTruthy()
    expect(within(waypoint).getByText("Needs attention")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Hide waypoints" })).toBeTruthy()
  })

  it("shows the waypoints with a button that hides them, for toggle-on", () => {
    renderEditor({ waypointOptions: "toggle-on" })

    fireEvent.click(screen.getByRole("button", { name: "Hide waypoints" }))

    expect(screen.queryByRole("region", { name: "Counts the holds that are still active" })).toBeNull()
  })

  it("shows the waypoints without a button for always-on, and neither for always-off", () => {
    const { rerender } = renderEditor({ waypointOptions: "always-on" })

    expect(screen.getByRole("region", { name: "Counts the holds that are still active" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /waypoints/ })).toBeNull()

    rerender({ waypointOptions: "always-off" })

    expect(screen.queryByRole("region", { name: "Counts the holds that are still active" })).toBeNull()
    expect(screen.queryByRole("button", { name: /waypoints/ })).toBeNull()
  })

  it("selects from a line number to the one clicked with shift, and reports the range from its button", () => {
    const { onHighlightCode } = renderEditor()

    fireEvent.click(screen.getByRole("button", { name: "Select line 3" }))
    fireEvent.click(screen.getByRole("button", { name: "Select line 2" }), { shiftKey: true })

    expect(screen.getByRole("button", { name: "Select line 2" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: "Select line 4" }).getAttribute("aria-pressed")).toBe("false")

    fireEvent.click(within(screen.getByRole("toolbar", { name: "Lines 2 to 3" })).getByRole("button", { name: "Add row" }))

    expect(onHighlightCode).toHaveBeenCalledWith({ lineStart: 2, lineEnd: 3 })
    expect(screen.queryByRole("toolbar")).toBeNull()
  })

  it("selects the lines of the code that is selected as text", () => {
    renderEditor()
    const range = document.createRange()
    range.setStart(screen.getByText("const second = 2"), 0)
    range.setEnd(screen.getByText("const fourth = 4"), 1)
    window.getSelection()?.removeAllRanges()
    window.getSelection()?.addRange(range)

    fireEvent.mouseUp(screen.getByText("const fourth = 4"))

    expect(screen.getByRole("toolbar", { name: "Lines 2 to 4" })).toBeTruthy()

    window.getSelection()?.removeAllRanges()
  })

  it("drops the selection when it is cleared", () => {
    renderEditor()

    fireEvent.click(screen.getByRole("button", { name: "Select line 1" }))
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(screen.queryByRole("toolbar")).toBeNull()
  })

  it("focuses the range it is told to and scrolls to it, each time the range changes", () => {
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView")
    const { rerender } = renderEditor({ focusOn: { lineStart: 2, lineEnd: 3 } })
    const scrolledLabels = () =>
      scrollIntoView.mock.contexts.map((line) => (line instanceof Element ? line.getAttribute("data-line") : null))
    const focusedLabels = () =>
      [...document.querySelectorAll("[data-focused='true']")].map((line) => line.getAttribute("data-line"))

    expect(focusedLabels()).toStrictEqual(["2", "3"])
    expect(scrolledLabels()).toStrictEqual(["2"])

    rerender({ focusOn: { lineStart: 4, lineEnd: 4 } })

    expect(focusedLabels()).toStrictEqual(["4"])
    expect(scrolledLabels()).toStrictEqual(["2", "4"])

    rerender({ focusOn: null })

    expect(focusedLabels()).toStrictEqual([])
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })

  it("draws a waypoint the way it is told to, and offers no line selection when nothing is highlighted", () => {
    render(
      <CodeViewEditor
        path={PATH}
        lines={LINES}
        statusMessage={null}
        waypoints={WAYPOINTS}
        waypointOptions="always-on"
        highlightButtonLabel={null}
        focusOn={null}
        renderWaypoint={(waypoint) => [<p key={waypoint.id}>{`Drawn: ${waypoint.title}`}</p>]}
        onHighlightCode={null}
      />,
    )

    expect(screen.getByText("Drawn: Counts the holds that are still active")).toBeTruthy()
    expect(screen.queryByRole("region", { name: "Counts the holds that are still active" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Select line 2" })).toBeNull()
  })
})
