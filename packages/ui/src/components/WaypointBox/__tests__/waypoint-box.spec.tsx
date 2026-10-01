import { fireEvent, render, screen, within } from "@testing-library/react"
import WaypointBox, { type WaypointContent } from "@/components/WaypointBox"
import { createFinding, paragraph } from "@/lib/__tests__/review-samples"

const createWaypoint = (overrides: Partial<WaypointContent> = {}): WaypointContent => ({
  anchorId: "waypoint-price-of",
  depth: 0,
  title: "Held units reduce the price",
  isDraft: false,
  positionLabel: "2 of 7",
  chip: { kind: "risk", label: "Risk" },
  attentionLabel: "Needs Attention",
  reading: paragraph("It subtracts the held units."),
  unwrittenLabel: "Not written yet.",
  needsAttention: paragraph("It can go below zero."),
  findings: [createFinding()],
  isReviewed: false,
  reviewLabel: "Reviewed",
  ...overrides,
})

const renderBox = (waypoint: WaypointContent, isOpen: boolean, handlers: { onToggle?: () => void, onReviewedChange?: (isReviewed: boolean) => void } = {}) =>
  render(
    <WaypointBox
      waypoint={waypoint}
      isOpen={isOpen}
      isCurrent={false}
      isReviewPending={false}
      codeLinks={{}}
      onOpenCodeLink={vi.fn()}
      onToggle={handlers.onToggle ?? vi.fn()}
      onReviewedChange={handlers.onReviewedChange ?? vi.fn()}
    />,
  )

describe("WaypointBox", () => {
  it("shows its title, chips and position while closed, and keeps the reading hidden", () => {
    renderBox(createWaypoint(), false)

    const box = screen.getByRole("region", { name: "Held units reduce the price" })

    expect(within(box).getByText("Risk")).toBeTruthy()
    expect(within(box).getByText("Needs Attention")).toBeTruthy()
    expect(within(box).getByText("2 of 7")).toBeTruthy()
    expect(within(box).queryByText("It subtracts the held units.")).toBeNull()
  })

  it("shows the reading, why it needs attention and its findings when open", () => {
    renderBox(createWaypoint(), true)

    expect(screen.getByText("It subtracts the held units.")).toBeTruthy()
    expect(screen.getByText("It can go below zero.")).toBeTruthy()
    expect(screen.getByText("The total can be negative")).toBeTruthy()
  })

  it("says so when the agent has not written it yet", () => {
    renderBox(createWaypoint({ reading: null, isDraft: true, title: "priceOf", chip: null, attentionLabel: null, needsAttention: null, findings: [] }), true)

    expect(screen.getByText("Not written yet.")).toBeTruthy()
  })

  it("reports a toggle and a reviewed mark separately", () => {
    const onToggle = vi.fn()
    const onReviewedChange = vi.fn()
    renderBox(createWaypoint(), false, { onToggle, onReviewedChange })

    fireEvent.click(screen.getByRole("button", { name: /Held units reduce the price/ }))
    fireEvent.click(screen.getByRole("button", { name: "Reviewed" }))

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onReviewedChange).toHaveBeenCalledWith(true)
  })

  it("marks the current and the reviewed box", () => {
    render(
      <WaypointBox
        waypoint={createWaypoint({ isReviewed: true })}
        isOpen={false}
        isCurrent
        isReviewPending={false}
        codeLinks={{}}
        onOpenCodeLink={vi.fn()}
        onToggle={vi.fn()}
        onReviewedChange={vi.fn()}
      />,
    )

    const box = screen.getByRole("region", { name: "Held units reduce the price" })

    expect(box.getAttribute("data-current")).toBe("true")
    expect(box.getAttribute("data-reviewed")).toBe("true")
  })
})
