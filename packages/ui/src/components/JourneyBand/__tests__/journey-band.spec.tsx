import { fireEvent, render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import JourneyBand, { type JourneyBandAuthoring } from "@/components/JourneyBand"

type JourneyBandProps = ComponentProps<typeof JourneyBand>

const createProps = (overrides: Partial<JourneyBandProps> = {}): JourneyBandProps => ({
  anchorId: "journey",
  heading: "Journey Flow Diagram",
  diagram: {
    anchorId: "journey-price",
    title: "A shopper sees a price",
    summaryLabel: "2 nodes",
    nodes: [],
    edges: [],
  },
  codeLinks: {},
  codeDefinitions: {},
  isReviewPending: false,
  onOpenCodeLink: vi.fn(),
  onWaypointReviewedChange: null,
  ...overrides,
})

const createAuthoring = (): JourneyBandAuthoring => ({
  board: { isPending: false, onAddCardAtLineEnd: vi.fn(), onMoveCards: vi.fn(), onDrawLine: vi.fn(), onRemoveLine: vi.fn(), onEditCard: vi.fn(), onRemoveCard: vi.fn() },
  onAddDiagram: vi.fn(),
  onRemoveDiagram: vi.fn(),
  onAddCard: vi.fn(),
})

describe("JourneyBand", () => {
  it("shows its heading, the title of the diagram and its summary", () => {
    render(<JourneyBand {...createProps()} />)

    expect(screen.getByRole("heading", { level: 2, name: "Journey Flow Diagram" })).toBeTruthy()
    expect(screen.getByRole("heading", { level: 3, name: "A shopper sees a price" })).toBeTruthy()
    expect(screen.getByText("2 nodes")).toBeTruthy()
  })

  it("shows only its heading when the journey is absent", () => {
    render(<JourneyBand {...createProps({ diagram: null })} />)

    expect(screen.getByRole("heading", { level: 2, name: "Journey Flow Diagram" })).toBeTruthy()
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull()
  })

  it("offers an author to add a diagram where there is none", () => {
    const authoring = createAuthoring()
    render(<JourneyBand {...createProps({ diagram: null, authoring })} />)

    fireEvent.click(screen.getByRole("button", { name: "Add a diagram" }))

    expect(authoring.onAddDiagram).toHaveBeenCalledTimes(1)
    expect(screen.getByText("This segment has no Journey Flow Diagram.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Add a card" })).toBeNull()
  })

  it("offers an author to add a card and to remove the diagram", () => {
    const authoring = createAuthoring()
    render(<JourneyBand {...createProps({ authoring })} />)

    fireEvent.click(screen.getByRole("button", { name: "Add a card" }))
    fireEvent.click(screen.getByRole("button", { name: "Remove the diagram" }))

    expect(authoring.onAddCard).toHaveBeenCalledTimes(1)
    expect(authoring.onRemoveDiagram).toHaveBeenCalledTimes(1)
  })

  it("offers a reviewer none of it", () => {
    render(<JourneyBand {...createProps()} />)

    expect(screen.queryByRole("button", { name: "Add a card" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Remove the diagram" })).toBeNull()
  })
})
