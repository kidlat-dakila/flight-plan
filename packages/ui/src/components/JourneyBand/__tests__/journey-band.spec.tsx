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
    description: [{ kind: "paragraph", inlines: [{ kind: "text", text: "A shopper opens a product, and the page asks for its price." }] }],
    descriptionMarkdown: "A shopper opens a product, and the page asks for its price.",
    unwrittenLabel: "Not written yet.",
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
  board: { isPending: false, onAddCard: vi.fn(), onClearDiagram: vi.fn(), onRemoveDiagram: vi.fn(), onAddCardAtLineEnd: vi.fn(), onMoveCards: vi.fn(), onDrawLine: vi.fn(), onRemoveLine: vi.fn(), onEditCard: vi.fn(), onRemoveCard: vi.fn() },
  description: { isWriting: false, isSaving: false, errorMessage: null, onEdit: vi.fn(), onSave: vi.fn(), onCancel: vi.fn() },
  onAddDiagram: vi.fn(),
})

describe("JourneyBand", () => {
  it("shows its heading and the description of the diagram, and neither a title of the diagram nor a count of nodes", () => {
    render(<JourneyBand {...createProps()} />)

    expect(screen.getByRole("heading", { level: 2, name: "Journey Flow Diagram" })).toBeTruthy()
    expect(screen.getByText("A shopper opens a product, and the page asks for its price.")).toBeTruthy()
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull()
    expect(screen.queryByText("A shopper sees a price")).toBeNull()
    expect(screen.queryByText(/\d+ nodes?/)).toBeNull()
  })

  it("says that a description is not written yet", () => {
    const { diagram } = createProps()
    render(<JourneyBand {...createProps({ diagram: diagram === null ? null : { ...diagram, description: null } })} />)

    expect(screen.getByText("Not written yet.")).toBeTruthy()
  })

  it("offers an author to edit the description beside the heading, and a reviewer not", () => {
    const authoring = createAuthoring()
    const { rerender } = render(<JourneyBand {...createProps({ authoring, renderDescriptionEditor: () => null })} />)

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))

    expect(authoring.description.onEdit).toHaveBeenCalledTimes(1)
    rerender(<JourneyBand {...createProps({ renderDescriptionEditor: () => null })} />)
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
  })

  it("puts the editor in place of the description while an author writes it, with what is written so far", () => {
    const authoring = createAuthoring()
    const renderDescriptionEditor = vi.fn(() => <p>The editor</p>)
    render(<JourneyBand {...createProps({ authoring: { ...authoring, description: { ...authoring.description, isWriting: true } }, renderDescriptionEditor })} />)

    expect(screen.getByText("The editor")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
    expect(screen.queryByText("A shopper opens a product, and the page asks for its price.")).toBeNull()
    expect(renderDescriptionEditor).toHaveBeenCalledWith(expect.objectContaining({ markdown: "A shopper opens a product, and the page asks for its price.", onSave: authoring.description.onSave }))
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

  it("offers an author to add a card and to remove the diagram in the toolbar of the board, and nothing to clear in a diagram with no card", () => {
    const authoring = createAuthoring()
    render(<JourneyBand {...createProps({ authoring })} />)

    fireEvent.click(screen.getByRole("button", { name: "Add a card" }))
    fireEvent.click(screen.getByRole("button", { name: "Remove the diagram" }))

    expect(authoring.board.onAddCard).toHaveBeenCalledTimes(1)
    expect(authoring.board.onRemoveDiagram).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Clear the diagram" })).toHaveProperty("disabled", true)
  })

  it("gives an author no instructions above the board", () => {
    render(<JourneyBand {...createProps({ authoring: createAuthoring() })} />)

    expect(screen.queryByText(/Drag a card to move it/)).toBeNull()
  })

  it("offers a reviewer none of it", () => {
    render(<JourneyBand {...createProps()} />)

    expect(screen.queryByRole("button", { name: "Add a card" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Remove the diagram" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Clear the diagram" })).toBeNull()
  })
})
