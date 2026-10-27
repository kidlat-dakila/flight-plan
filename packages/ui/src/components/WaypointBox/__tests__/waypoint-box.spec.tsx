import { fireEvent, render, screen, within } from "@testing-library/react"
import WaypointBox, { type WaypointContent } from "@/components/WaypointBox"
import { createFinding, paragraph } from "@/lib/__tests__/review-samples"

const createWaypoint = (overrides: Partial<WaypointContent> = {}): WaypointContent => ({
  id: "price-of",
  anchorId: "waypoint-price-of",
  depth: 0,
  title: "Held units reduce the price",
  isDraft: false,
  positionLabel: "2 of 7",
  chip: { kind: "risk", label: "Risk" },
  coreChangeLabel: "Core change",
  reading: paragraph("It subtracts the held units."),
  unwrittenLabel: "Not written yet.",
  hint: null,
  isBeingWritten: false,
  spotlight: null,
  coreChange: paragraph("It can go below zero."),
  findings: [createFinding()],
  isReviewed: false,
  reviewLabel: "Reviewed",
  ...overrides,
})

const unwrittenWaypoint = createWaypoint({
  reading: null,
  isDraft: true,
  title: "todoRouter",
  hint: "Adds a server action.",
  chip: null,
  coreChangeLabel: null,
  coreChange: null,
  findings: [],
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
    expect(within(box).getByText("Core change")).toBeTruthy()
    expect(within(box).getByText("2 of 7")).toBeTruthy()
    expect(within(box).queryByText("It subtracts the held units.")).toBeNull()
  })

  it("shows the spotlight after the core change in its head", () => {
    renderBox(createWaypoint({ spotlight: { label: "Spotlight", classifications: [{ key: "component", label: "Component" }] } }), false)

    const head = screen.getByRole("button", { expanded: false })

    expect(head.textContent).toMatch(/Core change.*Spotlight.*Component/)
  })

  it("shows the reading, why it is a core change and its findings when open", () => {
    renderBox(createWaypoint(), true)

    expect(screen.getByText("It subtracts the held units.")).toBeTruthy()
    expect(screen.getByText("It can go below zero.")).toBeTruthy()
    expect(screen.getByText("The total can be negative")).toBeTruthy()
  })

  it("shows what its card shows when the agent has not written it yet, with the hint and the buttons that ask for a write-up", () => {
    const onLine = vi.fn()
    const onBlock = vi.fn()
    render(
      <WaypointBox
        waypoint={unwrittenWaypoint}
        isOpen
        isCurrent={false}
        isReviewPending={false}
        codeLinks={{}}
        writeUp={{ onLine, onBlock }}
        onOpenCodeLink={vi.fn()}
        onToggle={vi.fn()}
        onReviewedChange={vi.fn()}
      />,
    )

    expect(screen.getByText("Adds a server action.")).toBeTruthy()
    expect(screen.getByText("This line of code is not explained or checked for issues yet.")).toBeTruthy()
    expect(screen.queryByText("Not written yet.")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /Explain this line/ }))
    fireEvent.click(screen.getByRole("button", { name: /Explain the whole code block/ }))

    expect(onLine).toHaveBeenCalledTimes(1)
    expect(onBlock).toHaveBeenCalledTimes(1)
  })

  it("says the agent is explaining it, with no buttons, while its write-up is being written", () => {
    render(
      <WaypointBox
        waypoint={{ ...unwrittenWaypoint, isBeingWritten: true }}
        isOpen
        isCurrent={false}
        isReviewPending={false}
        codeLinks={{}}
        writeUp={{ onLine: vi.fn(), onBlock: null }}
        onOpenCodeLink={vi.fn()}
        onToggle={vi.fn()}
        onReviewedChange={vi.fn()}
      />,
    )

    expect(screen.getByText("The agent is explaining this line.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Explain this line/ })).toBeNull()
  })

  it("offers its author a description instead when the waypoint has none", () => {
    const onWriteDescription = vi.fn()
    render(
      <WaypointBox
        waypoint={unwrittenWaypoint}
        isOpen
        isCurrent={false}
        isReviewPending={false}
        codeLinks={{}}
        onWriteDescription={onWriteDescription}
        onOpenCodeLink={vi.fn()}
        onToggle={vi.fn()}
        onReviewedChange={null}
      />,
    )

    expect(screen.getByText("This waypoint does not have any description or explanation.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Write description/ }))

    expect(onWriteDescription).toHaveBeenCalledTimes(1)
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

  it("has no review toggle when the page does not track reviews", () => {
    render(
      <WaypointBox
        waypoint={createWaypoint()}
        isOpen={false}
        isCurrent={false}
        isReviewPending={false}
        codeLinks={{}}
        onOpenCodeLink={vi.fn()}
        onToggle={vi.fn()}
        onReviewedChange={null}
      />,
    )

    expect(screen.queryByRole("button", { name: "Reviewed" })).toBeNull()
  })

  it("shows the actions it is given beside its title", () => {
    render(
      <WaypointBox
        waypoint={createWaypoint()}
        isOpen={false}
        isCurrent={false}
        isReviewPending={false}
        codeLinks={{}}
        actions={<button type="button">Edit the waypoint</button>}
        onOpenCodeLink={vi.fn()}
        onToggle={vi.fn()}
        onReviewedChange={null}
      />,
    )

    expect(within(screen.getByRole("region", { name: "Held units reduce the price" })).getByRole("button", { name: "Edit the waypoint" })).toBeTruthy()
  })

  it("marks what it shows as its waypoint", () => {
    renderBox(createWaypoint(), true)

    expect(screen.getByRole("region", { name: "Held units reduce the price" }).dataset).toMatchObject({ artifactPart: "waypoint", artifactId: "price-of" })
  })
})
