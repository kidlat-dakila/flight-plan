import { fireEvent, render, screen, within } from "@testing-library/react"
import type { ComponentProps } from "react"
import CodeWalkthrough, { type WalkthroughNavigation } from "@/components/CodeWalkthrough"
import { findNavigator, findNavigatorButton, navigatorLabels, renderInNavigator, SECTION_ANCHOR_ID } from "@/lib/__tests__/navigator-harness"

type CodeWalkthroughProps = ComponentProps<typeof CodeWalkthrough>

const createNavigation = (overrides: Partial<WalkthroughNavigation> = {}): WalkthroughNavigation => ({
  controls: {
    filter: {
      buttonLabel: "Filter",
      valueLabel: null,
      heading: "Show waypoints with",
      hint: "No kind ticked shows every kind.",
      options: [
        { key: "attention", label: "Needs Attention", countLabel: "1 waypoint", isSelected: false, toggledKeys: ["attention"] },
        { key: "bug", label: "Bug", countLabel: "2 waypoints", isSelected: false, toggledKeys: ["bug"] },
      ],
    },
    reviewedToggle: { label: "Reviewed", countLabel: "1 waypoint", isShown: false, isAvailable: true },
    stepping: { previousLabel: "Previous waypoint", nextLabel: "Next waypoint" },
    currentReview: { markLabel: "Mark as reviewed", reviewedLabel: "Reviewed" },
  },
  positionLabel: null,
  canStepBack: true,
  canStepForward: true,
  currentWaypoint: { isReviewed: false },
  areFilesCollapsed: false,
  isFileCollapsed: false,
  areWaypointsHidden: false,
  onPrevious: vi.fn(),
  onNext: vi.fn(),
  onCurrentReviewedChange: vi.fn(),
  onFilterChange: vi.fn(),
  onShowReviewedChange: vi.fn(),
  onFilesCollapsedChange: vi.fn(),
  onFileCollapsedChange: vi.fn(),
  onWaypointsHiddenChange: vi.fn(),
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

const renderWalkthrough = (navigation: Partial<WalkthroughNavigation> = {}) =>
  renderInNavigator(<CodeWalkthrough {...createProps({ navigation: createNavigation(navigation) })} />)

describe("CodeWalkthrough", () => {
  it("shows its heading, coverage and the files it is given", () => {
    render(<CodeWalkthrough {...createProps()} />)

    expect(screen.getByRole("heading", { level: 2, name: "Code Walkthrough" })).toBeTruthy()
    expect(screen.getByText("All 2 changed files")).toBeTruthy()
    expect(screen.getByText("The files")).toBeTruthy()
  })

  it("gives the navigator the stepping, the review, the filter and the layout of the files, in that order", async () => {
    renderWalkthrough()

    expect(await navigatorLabels("Next waypoint")).toStrictEqual([
      "Jump to",
      "Previous waypoint",
      "Next waypoint",
      "Mark as reviewed",
      "Filter",
      "Collapse all",
      "Collapse file",
      "Hide waypoints",
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

  it("marks the current waypoint reviewed with S, and offers to take the mark off once it is reviewed", async () => {
    const onCurrentReviewedChange = vi.fn()
    const view = renderWalkthrough({ onCurrentReviewedChange })
    await findNavigatorButton("Mark as reviewed")

    fireEvent.keyDown(document.body, { key: "s" })

    expect(onCurrentReviewedChange).toHaveBeenCalledWith(true)

    view.rerender(<CodeWalkthrough {...createProps({ navigation: createNavigation({ onCurrentReviewedChange, currentWaypoint: { isReviewed: true } }) })} />)
    fireEvent.click(await findNavigatorButton("Reviewed"))

    expect(onCurrentReviewedChange).toHaveBeenLastCalledWith(false)
    expect((await findNavigatorButton("Reviewed")).getAttribute("aria-pressed")).toBe("true")
  })

  it("cannot mark a waypoint reviewed before one is current, or while the waypoints are hidden", async () => {
    const view = renderWalkthrough({ currentWaypoint: null })

    expect((await findNavigatorButton("Mark as reviewed")).hasAttribute("disabled")).toBe(true)

    view.rerender(<CodeWalkthrough {...createProps({ navigation: createNavigation({ areWaypointsHidden: true }) })} />)

    expect((await findNavigatorButton("Mark as reviewed")).hasAttribute("disabled")).toBe(true)
  })

  it("filters by kind and shows the reviewed waypoints from the filter menu", async () => {
    const onFilterChange = vi.fn()
    const onShowReviewedChange = vi.fn()
    renderWalkthrough({ onFilterChange, onShowReviewedChange })
    await findNavigatorButton("Next waypoint")

    fireEvent.keyDown(document.body, { key: "f" })
    const menu = await screen.findByRole("menu")

    expect(within(menu).getAllByRole("menuitemcheckbox").map((item) => item.textContent)).toStrictEqual([
      "Needs Attention1 waypoint",
      "Bug2 waypoints",
      "Reviewed1 waypoint",
    ])

    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: /Bug/ }))
    fireEvent.click(within(menu).getByRole("menuitemcheckbox", { name: /Reviewed/ }))

    expect(onFilterChange).toHaveBeenCalledWith(["bug"])
    expect(onShowReviewedChange).toHaveBeenCalledWith(true)
  })

  it("has no review button and no filter when the page does not track them", async () => {
    renderWalkthrough({ onCurrentReviewedChange: null, onFilterChange: null, onShowReviewedChange: null })

    expect(await navigatorLabels("Next waypoint")).toStrictEqual(["Jump to", "Previous waypoint", "Next waypoint", "Collapse all", "Collapse file", "Hide waypoints"])
  })

  it("collapses every file with Q, the file being read with E, and hides the waypoints with X", async () => {
    const onFilesCollapsedChange = vi.fn()
    const onFileCollapsedChange = vi.fn()
    const onWaypointsHiddenChange = vi.fn()
    const view = renderWalkthrough({ onFilesCollapsedChange, onFileCollapsedChange, onWaypointsHiddenChange })
    await findNavigatorButton("Collapse all")

    fireEvent.keyDown(document.body, { key: "q" })
    fireEvent.keyDown(document.body, { key: "e" })
    fireEvent.keyDown(document.body, { key: "x" })

    expect(onFilesCollapsedChange).toHaveBeenCalledWith(true)
    expect(onFileCollapsedChange).toHaveBeenCalledWith(true)
    expect(onWaypointsHiddenChange).toHaveBeenCalledWith(true)

    view.rerender(<CodeWalkthrough {...createProps({ navigation: createNavigation({ areFilesCollapsed: true, isFileCollapsed: true, areWaypointsHidden: true }) })} />)

    expect(await navigatorLabels("Expand all")).toStrictEqual(["Jump to", "Previous waypoint", "Next waypoint", "Mark as reviewed", "Filter", "Expand all", "Expand file", "Show waypoints"])
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
