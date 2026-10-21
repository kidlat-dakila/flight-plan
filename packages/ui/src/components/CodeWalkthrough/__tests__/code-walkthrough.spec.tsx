import { fireEvent, render, screen, within } from "@testing-library/react"
import type { ComponentProps } from "react"
import CodeWalkthrough, { type WalkthroughNavigation } from "@/components/CodeWalkthrough"
import { findNavigator, findNavigatorButton, navigatorLabels, renderInNavigator, SECTION_ANCHOR_ID } from "@/lib/__tests__/navigator-harness"
import type { NavigatorRail } from "@/lib/navigator-controls"

type CodeWalkthroughProps = ComponentProps<typeof CodeWalkthrough>

const createNavigation = (overrides: Partial<WalkthroughNavigation> = {}): WalkthroughNavigation => ({
  controls: {
    filter: {
      buttonLabel: "Filter",
      badge: null,
      heading: "Show waypoints with",
      groups: [
        {
          id: "finding",
          options: [
            { key: "core-change", label: "Core change", detailLabel: "1 waypoint", detailChange: null, isSelected: false, toggledKeys: ["core-change"] },
            { key: "bug", label: "Bug", detailLabel: "2 waypoints", detailChange: null, isSelected: false, toggledKeys: ["bug"] },
          ],
          more: null,
        },
        {
          id: "block",
          options: [{ key: "block:hook:added", label: "Hook", detailLabel: "Added", detailChange: "added", isSelected: false, toggledKeys: ["block:hook:added"] }],
          more: {
            id: "more-blocks",
            label: "More",
            heading: "Code blocks",
            valueLabel: null,
            options: [{ key: "block:class:deleted", label: "Class", detailLabel: "Deleted", detailChange: "deleted", isSelected: false, toggledKeys: ["block:class:deleted"] }],
          },
        },
      ],
      submenus: [{
        id: "change",
        label: "Change type",
        heading: "Change type",
        valueLabel: "Added",
        options: [
          { key: "added", label: "Added", detailLabel: "3 waypoints", detailChange: null, isSelected: true, toggledKeys: [] },
          { key: "removed", label: "Removed", detailLabel: "1 waypoint", detailChange: null, isSelected: false, toggledKeys: ["added", "removed"] },
        ],
      }],
    },
    reviewedToggle: { label: "Reviewed", countLabel: "1 waypoint", isShown: false, isAvailable: true },
    stepping: { previousLabel: "Previous waypoint", nextLabel: "Next waypoint" },
    currentReview: { markLabel: "Mark as reviewed", reviewedLabel: "Reviewed" },
  },
  positionLabel: null,
  canStepBack: true,
  canStepForward: true,
  currentWaypoint: { isReviewed: false, isOpen: false, canComment: true, canWriteUp: false, canWriteUpBlock: false },
  areFilesCollapsed: false,
  isFileCollapsed: false,
  onPrevious: vi.fn(),
  onNext: vi.fn(),
  onCurrentReviewedChange: vi.fn(),
  onCommentOnCurrent: vi.fn(),
  onDescribeCurrent: null,
  onWriteUpCurrent: null,
  agentLabel: null,
  onFilterChange: vi.fn(),
  onShowReviewedChange: vi.fn(),
  onFilesCollapsedChange: vi.fn(),
  onFileCollapsedChange: vi.fn(),
  onCurrentOpenChange: vi.fn(),
  ...overrides,
})

const createProps = (overrides: Partial<CodeWalkthroughProps> = {}): CodeWalkthroughProps => ({
  anchorId: SECTION_ANCHOR_ID,
  heading: "Code Walkthrough",
  coverageLabel: "All 2 changed files",
  emptyMessage: null,
  navigation: createNavigation(),
  children: <p>The files</p>,
  onArrangeFiles: null,
  ...overrides,
})

const SURROUNDED_RAIL: NavigatorRail = {
  groups: [
    {
      anchorId: "one",
      label: "Requests (1/2)",
      sections: [{ anchorId: "one-blast", label: "Blast Diagram" }, { anchorId: SECTION_ANCHOR_ID, label: "Code Walkthrough" }],
    },
    { anchorId: "two", label: "Pages (2/2)", sections: [{ anchorId: "two-context", label: "Context" }] },
  ],
  sections: [],
}

const renderWalkthrough = (navigation: Partial<WalkthroughNavigation> = {}, rail?: NavigatorRail) =>
  renderInNavigator(<CodeWalkthrough {...createProps({ navigation: createNavigation(navigation) })} />, rail)

describe("CodeWalkthrough", () => {
  it("shows its heading, coverage and the files it is given", () => {
    render(<CodeWalkthrough {...createProps()} />)

    expect(screen.getByRole("heading", { level: 2, name: "Code Walkthrough" })).toBeTruthy()
    expect(screen.getByText("All 2 changed files")).toBeTruthy()
    expect(screen.getByText("The files")).toBeTruthy()
  })

  it("says beside the coverage when no waypoint has a write-up yet", () => {
    const { rerender } = render(<CodeWalkthrough {...createProps({ writeUpNotice: "Not explained yet" })} />)

    expect(screen.getByText("Not explained yet")).toBeTruthy()

    rerender(<CodeWalkthrough {...createProps()} />)

    expect(screen.queryByText("Not explained yet")).toBeNull()
  })

  it("counts the ticked filters in a badge on the Filter button", async () => {
    const navigation = createNavigation()
    renderWalkthrough({ controls: { ...navigation.controls, filter: { ...navigation.controls.filter, badge: { count: 2, label: "2 filters" } } } })
    const trigger = await within(await findNavigator()).findByRole("menuitem", { name: /Filter/ })

    expect(trigger.textContent).toBe("Filter22 filtersf")
    expect(within(trigger).getByText("2 filters").className).toContain("sr-only")
  })

  it("gives the navigator the stepping, the review, the filter and the layout of the files, in that order", async () => {
    renderWalkthrough()

    expect(await navigatorLabels("Next waypoint")).toStrictEqual([
      "Jump to",
      "Previous waypoint",
      "Next waypoint",
      "Mark as reviewed",
      "Add comment",
      "Filter",
      "Collapse all",
      "Collapse file",
      "Expand waypoint",
    ])
  })

  it("shows the position between the stepping buttons once a waypoint is current", async () => {
    renderWalkthrough({ positionLabel: "4 of 15" })

    expect(await within(await findNavigator()).findByText("4 of 15")).toBeTruthy()
  })

  it("steps with the buttons and with A and D", async () => {
    const onPrevious = vi.fn()
    const onNext = vi.fn()
    renderWalkthrough({ onPrevious, onNext })

    fireEvent.click(await findNavigatorButton("Next waypoint"))
    fireEvent.keyDown(document.body, { key: "d" })
    fireEvent.keyDown(document.body, { key: "a" })

    expect(onNext).toHaveBeenCalledTimes(2)
    expect(onPrevious).toHaveBeenCalledOnce()
  })

  it("keeps the waypoint steps while it has a waypoint to step to", async () => {
    renderWalkthrough({}, SURROUNDED_RAIL)

    expect((await navigatorLabels("Next waypoint")).slice(0, 3)).toStrictEqual(["Jump to", "Previous waypoint", "Next waypoint"])
  })

  it("steps back to the section before it and on to the next segment from the ends of its waypoints", async () => {
    const scrollIntoView = vi.fn()
    Reflect.defineProperty(Element.prototype, "scrollIntoView", { value: scrollIntoView, configurable: true })
    renderInNavigator(
      <>
        <div id="one-blast" />
        <CodeWalkthrough {...createProps({ navigation: createNavigation({ positionLabel: "1 of 1", canStepBack: false, canStepForward: false }) })} />
        <div id="two-context" />
      </>,
      SURROUNDED_RAIL,
    )

    expect((await navigatorLabels("Next: Segment (2/2)")).slice(0, 3)).toStrictEqual(["Jump to", "Back: Blast Diagram", "Next: Segment (2/2)"])
    expect(within(await findNavigator()).getByText("1 of 1")).toBeTruthy()

    fireEvent.keyDown(document.body, { key: "a" })
    fireEvent.keyDown(document.body, { key: "d" })

    expect(scrollIntoView.mock.contexts.flatMap((element) => (element instanceof Element ? [element.id] : []))).toStrictEqual(["one-blast", "two-context"])
  })

  it("marks the current waypoint reviewed with S, and offers to take the mark off once it is reviewed", async () => {
    const onCurrentReviewedChange = vi.fn()
    const view = renderWalkthrough({ onCurrentReviewedChange })
    await findNavigatorButton("Mark as reviewed")

    fireEvent.keyDown(document.body, { key: "s" })

    expect(onCurrentReviewedChange).toHaveBeenCalledWith(true)

    view.rerender(<CodeWalkthrough {...createProps({ navigation: createNavigation({ onCurrentReviewedChange, currentWaypoint: { isReviewed: true, isOpen: false, canComment: true, canWriteUp: false, canWriteUpBlock: false } }) })} />)
    fireEvent.click(await findNavigatorButton("Reviewed"))

    expect(onCurrentReviewedChange).toHaveBeenLastCalledWith(false)
    expect((await findNavigatorButton("Reviewed")).getAttribute("aria-pressed")).toBe("true")
  })

  it("cannot mark a waypoint reviewed before one is current, and says what to do when S is pressed or it is clicked", async () => {
    const onCurrentReviewedChange = vi.fn()
    renderWalkthrough({ currentWaypoint: null, onCurrentReviewedChange })
    const button = await findNavigatorButton("Mark as reviewed")

    expect(button.getAttribute("aria-disabled")).toBe("true")

    fireEvent.keyDown(document.body, { key: "s" })

    expect(await screen.findByText("Pick a waypoint first: press D to step to the next one.", { selector: "[data-slot=tooltip-content]" })).toBeTruthy()

    fireEvent.click(button)

    expect(onCurrentReviewedChange).not.toHaveBeenCalled()
  })

  it("starts a comment on the current waypoint with C, from the button right of Mark as reviewed", async () => {
    const onCommentOnCurrent = vi.fn()
    renderWalkthrough({ onCommentOnCurrent })
    const labels = await navigatorLabels("Add comment")

    expect(labels.indexOf("Add comment")).toBe(labels.indexOf("Mark as reviewed") + 1)

    fireEvent.keyDown(document.body, { key: "c" })

    expect(onCommentOnCurrent).toHaveBeenCalledOnce()
  })

  it("offers Write description with C in place of Add comment on the author's page", async () => {
    const onDescribeCurrent = vi.fn()
    const onCommentOnCurrent = vi.fn()
    renderWalkthrough({ onCommentOnCurrent, onDescribeCurrent })
    const labels = await navigatorLabels("Write description")

    expect(labels).not.toContain("Add comment")

    fireEvent.keyDown(document.body, { key: "c" })

    expect(onDescribeCurrent).toHaveBeenCalledOnce()
    expect(onCommentOnCurrent).not.toHaveBeenCalled()
  })

  it("asks for a write-up of the current waypoint with G and of its whole code block with Ctrl+G, while it has none", async () => {
    const onWriteUpCurrent = vi.fn()
    renderWalkthrough({ currentWaypoint: { isReviewed: false, isOpen: false, canComment: true, canWriteUp: true, canWriteUpBlock: true }, onWriteUpCurrent })
    const labels = await navigatorLabels("Explain this line")

    expect(labels.indexOf("Explain the whole code block")).toBe(labels.indexOf("Explain this line") + 1)

    fireEvent.keyDown(document.body, { key: "g" })
    fireEvent.keyDown(document.body, { key: "g", ctrlKey: true })
    fireEvent.keyDown(document.body, { key: "g", metaKey: true })

    expect(onWriteUpCurrent.mock.calls).toStrictEqual([["line"], ["block"]])
  })

  it("leaves a key held with Control to the browser unless a control asks for that chord", async () => {
    const onCurrentReviewedChange = vi.fn()
    renderWalkthrough({ onCurrentReviewedChange })
    await findNavigatorButton("Mark as reviewed")

    fireEvent.keyDown(document.body, { key: "s", ctrlKey: true })

    expect(onCurrentReviewedChange).not.toHaveBeenCalled()
  })

  it("offers no write-up for a waypoint that has one", async () => {
    const onWriteUpCurrent = vi.fn()
    renderWalkthrough({ onWriteUpCurrent })
    await findNavigatorButton("Mark as reviewed")

    fireEvent.keyDown(document.body, { key: "g" })

    expect(screen.queryByRole("button", { name: /Explain this line/ })).toBeNull()
    expect(onWriteUpCurrent).not.toHaveBeenCalled()
  })

  it("cannot start a comment on a waypoint that has no lines on the page, and says why", async () => {
    const onCommentOnCurrent = vi.fn()
    renderWalkthrough({ currentWaypoint: { isReviewed: false, isOpen: false, canComment: false, canWriteUp: false, canWriteUpBlock: false }, onCommentOnCurrent })
    const button = await findNavigatorButton("Add comment")

    expect(button.getAttribute("aria-disabled")).toBe("true")

    fireEvent.keyDown(document.body, { key: "c" })

    expect(await screen.findByText("This waypoint has no lines on the page to comment on.", { selector: "[data-slot=tooltip-content]" })).toBeTruthy()
    expect(onCommentOnCurrent).not.toHaveBeenCalled()
  })

  it("cannot expand a waypoint before one is current, and says what to do when R is pressed", async () => {
    const onCurrentOpenChange = vi.fn()
    renderWalkthrough({ currentWaypoint: null, onCurrentOpenChange })
    const button = await findNavigatorButton("Expand waypoint")

    expect(button.getAttribute("aria-disabled")).toBe("true")

    fireEvent.keyDown(document.body, { key: "r" })

    expect(await screen.findByText("Pick a waypoint first: press D to step to the next one.", { selector: "[data-slot=tooltip-content]" })).toBeTruthy()
    expect(onCurrentOpenChange).not.toHaveBeenCalled()
  })

  it("filters by kind and shows the reviewed waypoints from the filter menu", async () => {
    const onFilterChange = vi.fn()
    const onShowReviewedChange = vi.fn()
    renderWalkthrough({ onFilterChange, onShowReviewedChange })
    await findNavigatorButton("Next waypoint")

    fireEvent.keyDown(document.body, { key: "f" })
    const menu = await screen.findByRole("menu")

    expect(within(menu).getAllByRole("menuitemcheckbox").map((item) => item.textContent)).toStrictEqual([
      "Core change1 waypoint",
      "Bug2 waypoints",
      "HookAdded",
      "Reviewed1 waypoint",
    ])

    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: /Bug/ }))
    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: /Reviewed/ }))

    expect(onFilterChange).toHaveBeenCalledWith(["bug"])
    expect(onShowReviewedChange).toHaveBeenCalledWith(true)
  })

  it("lists the first code blocks in the filter menu, and the rest under More", async () => {
    const onFilterChange = vi.fn()
    renderWalkthrough({ onFilterChange })
    await findNavigatorButton("Next waypoint")

    fireEvent.keyDown(document.body, { key: "f" })
    const menu = await screen.findByRole("menu")

    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toStrictEqual(["More", "Change typeAdded"])

    fireEvent.click(within(menu).getByRole("menuitem", { name: "More" }))
    const more = (await screen.findAllByRole("menu")).find((candidate) => within(candidate).queryByText("Code blocks") !== null)

    fireEvent.click(within(more ?? document.body).getByRole("menuitemcheckbox", { name: /Class/ }))

    expect(onFilterChange).toHaveBeenCalledWith(["block:class:deleted"])
  })

  it("puts the change types in a submenu of the filter menu, named after what is ticked in it", async () => {
    const onFilterChange = vi.fn()
    renderWalkthrough({ onFilterChange })
    await findNavigatorButton("Next waypoint")

    fireEvent.keyDown(document.body, { key: "f" })
    const trigger = within(await screen.findByRole("menu")).getByRole("menuitem", { name: /Change type/ })

    expect(trigger.textContent).toBe("Change typeAdded")

    fireEvent.click(trigger)
    const submenu = (await screen.findAllByRole("menu")).find((menu) => within(menu).queryByRole("menuitemcheckbox", { name: /Removed/ }) !== null)

    expect(submenu).toBeDefined()

    fireEvent.click(within(submenu ?? document.body).getByRole("menuitemcheckbox", { name: /Removed/ }))
    fireEvent.click(within(submenu ?? document.body).getByRole("menuitemcheckbox", { name: /Added/ }))

    expect(onFilterChange.mock.calls).toStrictEqual([[["added", "removed"]], [null]])
  })

  it("has no review button and no filter when the page does not track them", async () => {
    renderWalkthrough({ onCurrentReviewedChange: null, onCommentOnCurrent: null, onFilterChange: null, onShowReviewedChange: null })

    expect(await navigatorLabels("Next waypoint")).toStrictEqual(["Jump to", "Previous waypoint", "Next waypoint", "Collapse all", "Collapse file", "Expand waypoint"])
  })

  it("collapses every file with Q, the file being read with E, and expands the current waypoint with R", async () => {
    const onFilesCollapsedChange = vi.fn()
    const onFileCollapsedChange = vi.fn()
    const onCurrentOpenChange = vi.fn()
    const view = renderWalkthrough({ onFilesCollapsedChange, onFileCollapsedChange, onCurrentOpenChange })
    await findNavigatorButton("Collapse all")

    fireEvent.keyDown(document.body, { key: "q" })
    fireEvent.keyDown(document.body, { key: "e" })
    fireEvent.keyDown(document.body, { key: "r" })

    expect(onFilesCollapsedChange).toHaveBeenCalledWith(true)
    expect(onFileCollapsedChange).toHaveBeenCalledWith(true)
    expect(onCurrentOpenChange).toHaveBeenCalledWith(true)

    const navigation = createNavigation({ areFilesCollapsed: true, isFileCollapsed: true, currentWaypoint: { isReviewed: false, isOpen: true, canComment: true, canWriteUp: false, canWriteUpBlock: false }, onCurrentOpenChange })
    view.rerender(<CodeWalkthrough {...createProps({ navigation })} />)

    expect(await navigatorLabels("Expand all")).toStrictEqual(["Jump to", "Previous waypoint", "Next waypoint", "Mark as reviewed", "Add comment", "Filter", "Expand all", "Expand file", "Collapse waypoint"])

    fireEvent.keyDown(document.body, { key: "r" })

    expect(onCurrentOpenChange).toHaveBeenLastCalledWith(false)
  })

  it("leaves the keys to a field that is being typed in", async () => {
    const onNext = vi.fn()
    renderInNavigator(
      <>
        <CodeWalkthrough {...createProps({ navigation: createNavigation({ onNext }) })} />
        <textarea aria-label="Comment" />
        <div role="textbox" aria-label="Rich comment" contentEditable suppressContentEditableWarning />
      </>,
    )
    await findNavigatorButton("Next waypoint")

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Comment" }), { key: "d" })
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Rich comment" }), { key: "d" })
    fireEvent.keyDown(document.body, { key: "d", metaKey: true })

    expect(onNext).not.toHaveBeenCalled()
  })

  it("says why no file is shown", () => {
    render(<CodeWalkthrough {...createProps({ emptyMessage: "The walkthrough has no files yet." })} />)

    expect(screen.getByText("The walkthrough has no files yet.")).toBeTruthy()
  })

  it("offers to arrange the files only when it can", () => {
    const onArrangeFiles = vi.fn<() => void>()
    const view = render(<CodeWalkthrough {...createProps()} />)

    expect(screen.queryByRole("button", { name: "Arrange files" })).toBeNull()

    view.rerender(<CodeWalkthrough {...createProps({ onArrangeFiles })} />)
    fireEvent.click(screen.getByRole("button", { name: "Arrange files" }))

    expect(onArrangeFiles).toHaveBeenCalledTimes(1)
  })
})
