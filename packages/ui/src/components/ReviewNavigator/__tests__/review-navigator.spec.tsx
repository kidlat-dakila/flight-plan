import { fireEvent, render, screen, within } from "@testing-library/react"
import ReviewNavigator, { navigatorLeftOf, ReviewNavigatorBar } from "@/components/ReviewNavigator"
import { findNavigator, findNavigatorButton, showSectionInView } from "@/lib/__tests__/navigator-harness"
import { useNavigatorSection } from "@/lib/navigator"
import { navigatorButtonOf, type NavigatorRail } from "@/lib/navigator-controls"

const RAIL: NavigatorRail = {
  groups: [
    { anchorId: "one", label: "Requests (1/2)", sections: [{ anchorId: "one-context", label: "Context" }, { anchorId: "one-walkthrough", label: "Code Walkthrough" }] },
    { anchorId: "two", label: "Pages (2/2)", sections: [{ anchorId: "two-context", label: "Context" }] },
  ],
  sections: [],
}

const Section = ({ anchorId, onRun }: { readonly anchorId: string, readonly onRun: () => void }) => {
  useNavigatorSection(anchorId, [[navigatorButtonOf({ key: "q", label: `Collapse ${anchorId}`, onRun })]])
  return <section id={anchorId}>{anchorId}</section>
}

const renderPage = (onRun = vi.fn()) =>
  render(
    <ReviewNavigator rail={RAIL}>
      <Section anchorId="one-context" onRun={onRun} />
      <Section anchorId="one-walkthrough" onRun={onRun} />
      <Section anchorId="two-context" onRun={onRun} />
      <ReviewNavigatorBar />
    </ReviewNavigator>,
  )

describe("ReviewNavigator", () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    scrollIntoView.mockClear()
    Reflect.defineProperty(Element.prototype, "scrollIntoView", { value: scrollIntoView, configurable: true })
  })

  it("shows Jump to and the controls of the section that fills the screen", async () => {
    showSectionInView("one-walkthrough")
    renderPage()

    expect(await findNavigatorButton("Collapse one-walkthrough")).toBeTruthy()
    expect(within(await findNavigator()).queryByRole("button", { name: "Collapse one-context" })).toBeNull()
  })

  it("runs the control of a key in the section on screen, and only there", async () => {
    const onRun = vi.fn()
    showSectionInView("two-context")
    renderPage(onRun)
    await findNavigatorButton("Collapse two-context")

    fireEvent.keyDown(document.body, { key: "Q" })

    expect(onRun).toHaveBeenCalledOnce()
  })

  it("steps to the section before and after the one on screen with A and D", async () => {
    showSectionInView("one-walkthrough")
    renderPage()

    expect(await findNavigatorButton("Back: Context")).toBeTruthy()
    expect(await findNavigatorButton("Next: Segment (2/2)")).toBeTruthy()

    fireEvent.keyDown(document.body, { key: "a" })
    fireEvent.keyDown(document.body, { key: "d" })

    expect(scrollIntoView.mock.contexts.flatMap((element) => (element instanceof Element ? [element.id] : []))).toStrictEqual(["one-context", "two-context"])
  })

  it("has no Back on the first section", async () => {
    showSectionInView("one-context")
    renderPage()

    expect(await findNavigatorButton("Next: Code Walkthrough")).toBeTruthy()
    expect(within(await findNavigator()).queryByRole("button", { name: /^Back/ })).toBeNull()
  })

  it("opens Jump to with W, lists the sections of this segment and the other segments, and jumps to the one chosen", async () => {
    showSectionInView("one-walkthrough")
    renderPage()
    await findNavigatorButton("Collapse one-walkthrough")

    fireEvent.keyDown(document.body, { key: "w" })
    const menu = await screen.findByRole("menu")

    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toStrictEqual(["Context", "Code WalkthroughHere", "Pages (2/2)"])

    fireEvent.click(within(menu).getByRole("menuitem", { name: "Context" }))

    expect(scrollIntoView.mock.contexts).toStrictEqual([document.getElementById("one-context")])
  })

  it("closes Jump to when W is pressed again", async () => {
    showSectionInView("one-walkthrough")
    renderPage()
    await findNavigatorButton("Collapse one-walkthrough")

    fireEvent.keyDown(document.body, { key: "w" })
    const menu = await screen.findByRole("menu")
    fireEvent.keyDown(menu, { key: "w" })

    expect(screen.queryByRole("menu")).toBeNull()
  })

  it("leaves the keys alone while a dialog of the page is open", async () => {
    const onRun = vi.fn()
    showSectionInView("one-context")
    render(
      <ReviewNavigator rail={RAIL}>
        <Section anchorId="one-context" onRun={onRun} />
        <div role="dialog" aria-modal="true" aria-label="Arrange segments">
          <button type="button">Move up</button>
        </div>
        <ReviewNavigatorBar />
      </ReviewNavigator>,
    )
    await findNavigatorButton("Collapse one-context")

    fireEvent.keyDown(screen.getByRole("button", { name: "Move up" }), { key: "q" })
    fireEvent.keyDown(document.body, { key: "q" })

    expect(onRun).not.toHaveBeenCalled()
  })

  it("draws nothing outside a navigator", () => {
    const { container } = render(<ReviewNavigatorBar />)

    expect(container.childElementCount).toBe(0)
  })
})

describe("navigatorLeftOf", () => {
  it("centres the navigator on the main column until it knows how wide it is", () => {
    expect(navigatorLeftOf(null)).toBe("calc(var(--navigator-inset-left, 0px) + (100% - var(--navigator-inset-left, 0px) - var(--navigator-inset-right, 0px)) / 2)")
  })

  it("keeps a navigator of known width between the gutter and the right edge of the page", () => {
    expect(navigatorLeftOf(800)).toBe(
      "clamp(calc(1.5rem + 400px), calc(var(--navigator-inset-left, 0px) + (100% - var(--navigator-inset-left, 0px) - var(--navigator-inset-right, 0px)) / 2), calc(100% - var(--navigator-inset-right, 1.5rem) - 400px))",
    )
  })
})
