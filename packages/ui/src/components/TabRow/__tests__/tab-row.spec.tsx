import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { useState } from "react"
import TabRow, { type RowTab } from "@/components/TabRow"

const TAB_WIDTH = 100
const MORE_BUTTON_WIDTH = 70
const NARROW_ROW_WIDTH = 380

const LABELS = ["Stock check", "Checkout", "Refund", "Shipping", "Invoice", "Returns"]

const TABS: readonly RowTab[] = LABELS.map((label) => ({ key: label, label }))

const ignoreResize = (): undefined => undefined

class ResizeObserverMeasuringAtOnce implements ResizeObserver {
  readonly #onResize: ResizeObserverCallback

  constructor(onResize: ResizeObserverCallback) {
    this.#onResize = onResize
  }

  readonly observe = (): void => {
    this.#onResize([], this)
  }

  readonly unobserve = ignoreResize
  readonly disconnect = ignoreResize
}

const widthOf = (element: Element): number => {
  if (element.hasAttribute("data-ruler-tab")) return TAB_WIDTH
  if (element.hasAttribute("data-ruler-more-button")) return MORE_BUTTON_WIDTH
  return NARROW_ROW_WIDTH
}

const layOutNarrowRow = (): void => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMeasuringAtOnce)
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function measured(this: Element) {
    return DOMRect.fromRect({ width: widthOf(this), height: 0 })
  })
}

const OpenTabRow = ({ openIndexAtStart = 0 }: { readonly openIndexAtStart?: number }) => {
  const [openIndex, setOpenIndex] = useState(openIndexAtStart)
  return <TabRow tabs={TABS} openIndex={openIndex} label="Trace Diagram" onOpen={setOpenIndex} />
}

const tabLabels = (): readonly (string | null)[] =>
  within(screen.getByRole("tablist", { name: "Trace Diagram" })).getAllByRole("tab").map((tab) => tab.textContent)

describe("TabRow", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("shows every tab and no More button while the row has no width", () => {
    render(<OpenTabRow />)

    expect(tabLabels()).toStrictEqual(LABELS)
    expect(screen.queryByRole("button", { name: /more/u })).toBeNull()
  })

  it("gives each tab its own id and the panel it controls, with only the open tab reachable by Tab", () => {
    const tabs = [{ key: "a", label: "Added", id: "tab-a", controlsId: "panel-a" }, { key: "b", label: "Removed", id: "tab-b" }]
    render(<TabRow tabs={tabs} openIndex={0} label="Changes" onOpen={vi.fn()} />)

    const [added, removed] = screen.getAllByRole("tab")

    expect([added.id, added.getAttribute("aria-controls"), added.getAttribute("aria-selected"), added.tabIndex]).toStrictEqual(["tab-a", "panel-a", "true", 0])
    expect([removed.id, removed.getAttribute("aria-controls"), removed.getAttribute("aria-selected"), removed.tabIndex]).toStrictEqual(["tab-b", null, "false", -1])
  })

  it("reports the tab that is clicked", () => {
    const onOpen = vi.fn()
    render(<TabRow tabs={TABS} openIndex={0} label="Trace Diagram" onOpen={onOpen} />)

    fireEvent.click(screen.getByRole("tab", { name: "Refund" }))

    expect(onOpen).toHaveBeenCalledWith(2)
  })

  it("puts the tabs that do not fit behind a More button", async () => {
    layOutNarrowRow()
    render(<OpenTabRow />)

    expect(tabLabels()).toStrictEqual(["Stock check", "Checkout", "Refund"])

    fireEvent.click(screen.getByRole("button", { name: "3 more tabs" }))

    expect((await screen.findAllByRole("menuitem")).map((item) => item.textContent)).toStrictEqual(["Shipping", "Invoice", "Returns"])
  })

  it("opens a tab chosen from the More menu in the row, in place of the last tab that fitted", async () => {
    layOutNarrowRow()
    render(<OpenTabRow />)

    fireEvent.click(screen.getByRole("button", { name: "3 more tabs" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Invoice" }))

    expect(tabLabels()).toStrictEqual(["Stock check", "Checkout", "Invoice"])
    expect(screen.getByRole("tab", { name: "Invoice" }).getAttribute("aria-selected")).toBe("true")
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Invoice" }))
    })
  })

  it("keeps the open tab in the row when it starts past the tabs that fit", () => {
    layOutNarrowRow()
    render(<OpenTabRow openIndexAtStart={5} />)

    expect(tabLabels()).toStrictEqual(["Stock check", "Checkout", "Returns"])
  })

  it("moves across the hidden tabs with the keys, and shows and focuses the tab it opens", () => {
    layOutNarrowRow()
    render(<OpenTabRow />)

    fireEvent.keyDown(screen.getByRole("tab", { name: "Stock check" }), { key: "End" })

    expect(tabLabels()).toStrictEqual(["Stock check", "Checkout", "Returns"])
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Returns" }))

    fireEvent.keyDown(screen.getByRole("tab", { name: "Returns" }), { key: "ArrowLeft" })

    expect(tabLabels()).toStrictEqual(["Stock check", "Checkout", "Invoice"])
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Invoice" }))
  })
})
