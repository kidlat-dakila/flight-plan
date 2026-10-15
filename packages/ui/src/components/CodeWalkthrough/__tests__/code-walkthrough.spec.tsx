import { fireEvent, render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import CodeWalkthrough from "@/components/CodeWalkthrough"

type CodeWalkthroughProps = ComponentProps<typeof CodeWalkthrough>

const createProps = (overrides: Partial<CodeWalkthroughProps> = {}): CodeWalkthroughProps => ({
  anchorId: "walkthrough",
  heading: "Code Walkthrough",
  coverageLabel: "All 2 changed files",
  controls: {
    filter: { buttonLabel: "Filter", isDefault: true, resetLabel: "Reset", options: [] },
    reviewedToggle: { label: "Show reviewed (1)", isShown: false, isAvailable: true },
    stepping: { previousLabel: "Previous waypoint (K)", nextLabel: "Next waypoint (J)" },
  },
  positionLabel: "3 waypoints",
  canStepBack: true,
  canStepForward: true,
  emptyMessage: null,
  children: <p>The files</p>,
  onArrangeFiles: null,
  onPrevious: vi.fn(),
  onNext: vi.fn(),
  onFilterChange: vi.fn(),
  onShowReviewedChange: vi.fn(),
  ...overrides,
})

describe("CodeWalkthrough", () => {
  it("shows its heading, coverage and the files it is given", () => {
    render(<CodeWalkthrough {...createProps()} />)

    expect(screen.getByRole("heading", { level: 2, name: "Code Walkthrough" })).toBeTruthy()
    expect(screen.getByText("All 2 changed files")).toBeTruthy()
    expect(screen.getByText("The files")).toBeTruthy()
  })

  it("steps to the next waypoint", () => {
    const onNext = vi.fn()
    render(<CodeWalkthrough {...createProps({ onNext })} />)

    fireEvent.click(screen.getByRole("button", { name: "Next waypoint (J)" }))

    expect(onNext).toHaveBeenCalledOnce()
  })

  it("shows the reviewed files when asked", () => {
    const onShowReviewedChange = vi.fn()
    render(<CodeWalkthrough {...createProps({ onShowReviewedChange })} />)

    fireEvent.click(screen.getByRole("button", { name: "Show reviewed (1)" }))

    expect(onShowReviewedChange).toHaveBeenCalledWith(true)
  })

  it("has no reviewed toggle and no filter when the page does not track them", () => {
    render(<CodeWalkthrough {...createProps({ onShowReviewedChange: null, onFilterChange: null })} />)

    expect(screen.queryByRole("button", { name: "Show reviewed (1)" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Filter" })).toBeNull()
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
