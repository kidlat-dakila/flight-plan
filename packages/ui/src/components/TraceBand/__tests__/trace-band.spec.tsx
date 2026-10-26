import { fireEvent, render, screen, within } from "@testing-library/react"
import type { ComponentProps } from "react"
import TraceBand, { type TraceBandAuthoring } from "@/components/TraceBand"
import { findNavigator, findNavigatorButton, renderInNavigator, SECTION_ANCHOR_ID } from "@/lib/__tests__/navigator-harness"
import { WritingContext } from "@/lib/writing-context"

type TraceBandProps = ComponentProps<typeof TraceBand>

const createProps = (overrides: Partial<TraceBandProps> = {}): TraceBandProps => ({
  anchorId: "traceDiagram",
  heading: "Trace Diagram",
  diagram: {
    anchorId: "trace-price",
    title: "A shopper sees a price",
    writtenTitle: null,
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

const createAuthoring = (): TraceBandAuthoring => ({
  board: { isPending: false, onAddCard: vi.fn(), onClearDiagram: vi.fn(), onRemoveDiagram: vi.fn(), onAddCardAtLineEnd: vi.fn(), onDrawLine: vi.fn(), onRemoveLine: vi.fn(), onEditCard: vi.fn(), onRemoveCard: vi.fn() },
  description: { isWriting: false, isSaving: false, errorMessage: null, onEdit: vi.fn(), onSave: vi.fn(), onCancel: vi.fn() },
  onAddDiagram: vi.fn(),
})

describe("TraceBand", () => {
  it("shows its heading and the description of the diagram, and neither a title of the diagram nor a count of nodes", () => {
    render(<TraceBand {...createProps()} />)

    expect(screen.getByRole("heading", { level: 2, name: "Trace Diagram" })).toBeTruthy()
    expect(screen.getByText("A shopper opens a product, and the page asks for its price.")).toBeTruthy()
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull()
    expect(screen.queryByText("A shopper sees a price")).toBeNull()
    expect(screen.queryByText(/\d+ nodes?/)).toBeNull()
  })

  it("marks its heading and description as the Trace Diagram of the segment", () => {
    render(<TraceBand {...createProps()} />)

    const heading = screen.getByRole("heading", { level: 2, name: "Trace Diagram" })

    expect(heading.closest("[data-artifact-part]")?.getAttribute("data-artifact-part")).toBe("trace-diagram")
    expect(screen.getByText("A shopper opens a product, and the page asks for its price.").closest("[data-artifact-part]")?.getAttribute("data-artifact-part")).toBe("trace-diagram")
  })

  it("puts the title written for its only diagram in place of its heading", () => {
    const { diagram } = createProps()
    render(<TraceBand {...createProps({ diagram: diagram === null ? null : { ...diagram, writtenTitle: "Price product flow diagram" } })} />)

    expect(screen.getByRole("heading", { level: 2, name: "Price product flow diagram" })).toBeTruthy()
    expect(screen.queryByText("Trace Diagram")).toBeNull()
  })

  it("draws a skeleton in place of its heading while an agent writes the title of its only diagram", () => {
    render(
      <WritingContext value="Writing the review">
        <TraceBand {...createProps()} />
      </WritingContext>,
    )

    expect(screen.getByRole("heading", { level: 2, name: "Writing the review" })).toBeTruthy()
  })

  it("says that a description is not written yet", () => {
    const { diagram } = createProps()
    render(<TraceBand {...createProps({ diagram: diagram === null ? null : { ...diagram, description: null } })} />)

    expect(screen.getByText("Not written yet.")).toBeTruthy()
  })

  it("shows Flight Plan's hint in place of a description that is not written", () => {
    const { diagram } = createProps()
    render(<TraceBand {...createProps({ diagram: diagram === null ? null : { ...diagram, description: null, descriptionHint: "Runs through a page and a data model." } })} />)

    expect(screen.getByText("Runs through a page and a data model.")).toBeTruthy()
    expect(screen.queryByText("Not written yet.")).toBeNull()
  })

  it("says beside the heading when the diagram has no write-up yet", () => {
    const { rerender } = render(<TraceBand {...createProps({ writeUpNotice: "Not explained yet" })} />)

    expect(screen.getByText("Not explained yet")).toBeTruthy()

    rerender(<TraceBand {...createProps()} />)

    expect(screen.queryByText("Not explained yet")).toBeNull()
  })

  it("offers an author to edit the description beside the heading, and a reviewer not", () => {
    const authoring = createAuthoring()
    const { rerender } = render(<TraceBand {...createProps({ authoring, renderDescriptionEditor: () => null })} />)

    fireEvent.click(screen.getByRole("button", { name: "Edit" }))

    expect(authoring.description.onEdit).toHaveBeenCalledTimes(1)
    rerender(<TraceBand {...createProps({ renderDescriptionEditor: () => null })} />)
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
  })

  it("puts the editor in place of the description while an author writes it, with what is written so far", () => {
    const authoring = createAuthoring()
    const renderDescriptionEditor = vi.fn(() => <p>The editor</p>)
    render(<TraceBand {...createProps({ authoring: { ...authoring, description: { ...authoring.description, isWriting: true } }, renderDescriptionEditor })} />)

    expect(screen.getByText("The editor")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
    expect(screen.queryByText("A shopper opens a product, and the page asks for its price.")).toBeNull()
    expect(renderDescriptionEditor).toHaveBeenCalledWith(expect.objectContaining({ markdown: "A shopper opens a product, and the page asks for its price." }))
  })

  it("asks the author for the title above the editor and saves it with the description", () => {
    const authoring = createAuthoring()
    const { diagram } = createProps()
    const renderDescriptionEditor = vi.fn((request: { readonly onSave: (markdown: string) => void }) => (
      <button type="button" onClick={() => { request.onSave("A shopper opens a product.") }}>Save</button>
    ))
    const props = createProps({
      diagram: diagram === null ? null : { ...diagram, writtenTitle: "Price flow diagram" },
      authoring: { ...authoring, description: { ...authoring.description, isWriting: true } },
      renderDescriptionEditor,
    })
    render(<TraceBand {...props} />)

    expect(screen.getByRole("textbox", { name: "Title" })).toBe(screen.getByDisplayValue("Price flow diagram"))
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Price product flow diagram" } })
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(authoring.description.onSave).toHaveBeenCalledWith({ title: "Price product flow diagram", description: "A shopper opens a product." })
  })

  const tabDiagram = (anchorId: string, title: string, text: string) => ({
    anchorId,
    title,
    writtenTitle: title,
    description: [{ kind: "paragraph" as const, inlines: [{ kind: "text" as const, text }] }],
    descriptionMarkdown: text,
    unwrittenLabel: "Not written yet.",
    nodes: [],
    edges: [],
  })

  const diagramTabs = [
    { id: "stock", label: "Stock check", diagram: tabDiagram("trace-stock", "Stock check", "A shopper adds a line, and the stock is read.") },
    { id: "checkout", label: "Checkout", diagram: tabDiagram("trace-checkout", "Checkout", "A shopper pays, and the order is written.") },
  ]

  it("shows a review without segments as one tab per diagram, the first open", () => {
    render(<TraceBand {...createProps({ diagram: null, tabs: diagramTabs })} />)

    const tabList = screen.getByRole("tablist", { name: "Trace Diagram" })

    expect(screen.getByRole("heading", { level: 2, name: "Trace Diagram" })).toBeTruthy()

    expect(within(tabList).getAllByRole("tab").map((tab) => tab.textContent)).toStrictEqual(["Stock check", "Checkout"])
    expect(screen.getByRole("tab", { name: "Stock check" }).getAttribute("aria-selected")).toBe("true")
    expect(screen.getByRole("tabpanel", { name: "Stock check" }).id).toBe("trace-stock")
    expect(screen.getByText("A shopper adds a line, and the stock is read.")).toBeTruthy()
    expect(screen.queryByText("A shopper pays, and the order is written.")).toBeNull()
  })

  it("opens another tab by click and by the arrow keys", () => {
    render(<TraceBand {...createProps({ diagram: null, tabs: diagramTabs })} />)

    fireEvent.click(screen.getByRole("tab", { name: "Checkout" }))

    expect(screen.getByText("A shopper pays, and the order is written.")).toBeTruthy()

    fireEvent.keyDown(screen.getByRole("tab", { name: "Checkout" }), { key: "ArrowRight" })

    expect(screen.getByRole("tab", { name: "Stock check" }).getAttribute("aria-selected")).toBe("true")
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Stock check" }))
  })

  it("gives the author the editing of the open tab's own diagram", () => {
    const authoringOf = vi.fn(() => createAuthoring())
    render(<TraceBand {...createProps({ diagram: null, tabs: diagramTabs, tabEditing: { authoringOf, cardMovingOf: () => null, writeUpOf: () => null }, renderDescriptionEditor: () => null })} />)

    fireEvent.click(screen.getByRole("tab", { name: "Checkout" }))

    expect(authoringOf).toHaveBeenLastCalledWith("checkout")
    expect(screen.queryByRole("button", { name: "Add a diagram" })).toBeNull()
  })

  it("opens its diagram on the page unless asked to open it full screen", async () => {
    const { unmount } = render(<TraceBand {...createProps()} />)

    expect(screen.queryByRole("dialog", { name: "A shopper sees a price" })).toBeNull()

    unmount()
    render(<TraceBand {...createProps({ isFullScreenAtStart: true })} />)

    expect(await screen.findByRole("dialog", { name: "A shopper sees a price" })).toBeTruthy()
  })

  it("opens the diagram of the open tab full screen when asked to", async () => {
    render(<TraceBand {...createProps({ diagram: null, tabs: diagramTabs, isFullScreenAtStart: true })} />)

    expect(await screen.findByRole("dialog", { name: "Stock check" })).toBeTruthy()
    expect(screen.queryByRole("dialog", { name: "Checkout" })).toBeNull()
  })

  it("opens the tab it is asked to open at start, and the first tab for an id it does not have", () => {
    const { unmount } = render(<TraceBand {...createProps({ diagram: null, tabs: diagramTabs, openTabIdAtStart: "checkout" })} />)

    expect(screen.getByRole("tab", { name: "Checkout" }).getAttribute("aria-selected")).toBe("true")
    expect(screen.getByText("A shopper pays, and the order is written.")).toBeTruthy()

    unmount()
    render(<TraceBand {...createProps({ diagram: null, tabs: diagramTabs, openTabIdAtStart: "missing" })} />)

    expect(screen.getByRole("tab", { name: "Stock check" }).getAttribute("aria-selected")).toBe("true")
  })

  it("opens the diagram of the tab asked for full screen when asked to", async () => {
    render(<TraceBand {...createProps({ diagram: null, tabs: diagramTabs, openTabIdAtStart: "checkout", isFullScreenAtStart: true })} />)

    expect(await screen.findByRole("dialog", { name: "Checkout" })).toBeTruthy()
    expect(screen.queryByRole("dialog", { name: "Stock check" })).toBeNull()
  })

  it("shows only its heading when the trace is absent", () => {
    render(<TraceBand {...createProps({ diagram: null })} />)

    expect(screen.getByRole("heading", { level: 2, name: "Trace Diagram" })).toBeTruthy()
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull()
  })

  it("offers an author to add a diagram where there is none", () => {
    const authoring = createAuthoring()
    render(<TraceBand {...createProps({ diagram: null, authoring })} />)

    fireEvent.click(screen.getByRole("button", { name: "Add a diagram" }))

    expect(authoring.onAddDiagram).toHaveBeenCalledTimes(1)
    expect(screen.getByText("This segment has no Trace Diagram.")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Add card" })).toBeNull()
  })

  it("offers an author to add a card and to remove the diagram in the review navigator, and nothing to clear in a diagram with no card", async () => {
    const authoring = createAuthoring()
    renderInNavigator(<TraceBand {...createProps({ anchorId: SECTION_ANCHOR_ID, authoring })} />)

    fireEvent.click(await findNavigatorButton("Add card"))
    fireEvent.click(await findNavigatorButton("Clear diagram"))
    fireEvent.click(await findNavigatorButton("Remove diagram"))
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Remove this diagram?" })).getByRole("button", { name: "Remove diagram" }))

    expect(authoring.board.onAddCard).toHaveBeenCalledTimes(1)
    expect(authoring.board.onRemoveDiagram).toHaveBeenCalledTimes(1)
    expect(authoring.board.onClearDiagram).not.toHaveBeenCalled()
    expect((await findNavigatorButton("Clear diagram")).getAttribute("aria-disabled")).toBe("true")
  })

  it("leaves the keys of the diagram alone while the author types", async () => {
    const authoring = createAuthoring()
    renderInNavigator(
      <>
        <input aria-label="A note" />
        <TraceBand {...createProps({ anchorId: SECTION_ANCHOR_ID, authoring })} />
      </>,
    )
    await findNavigatorButton("Add card")

    fireEvent.keyDown(screen.getByRole("textbox", { name: "A note" }), { key: "c" })
    fireEvent.keyDown(screen.getByRole("textbox", { name: "A note" }), { key: "l" })

    expect(authoring.board.onAddCard).not.toHaveBeenCalled()
    expect(authoring.board.onRemoveDiagram).not.toHaveBeenCalled()
  })

  it("gives an author no instructions above the board", () => {
    render(<TraceBand {...createProps({ authoring: createAuthoring() })} />)

    expect(screen.queryByText(/Drag a card to move it/)).toBeNull()
  })

  it("offers a reviewer none of it", async () => {
    renderInNavigator(<TraceBand {...createProps({ anchorId: SECTION_ANCHOR_ID })} />)
    const navigator = within(await findNavigator())

    await findNavigatorButton("Collapse all")

    expect(navigator.queryByRole("button", { name: "Add card" })).toBeNull()
    expect(navigator.queryByRole("button", { name: "Remove diagram" })).toBeNull()
    expect(navigator.queryByRole("button", { name: "Clear diagram" })).toBeNull()
  })
})
