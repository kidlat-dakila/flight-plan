import { fireEvent, render, screen, within } from "@testing-library/react"
import ReviewNavigator, { ReviewNavigatorBar } from "@/components/ReviewNavigator"
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
