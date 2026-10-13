import { fireEvent, render, screen, within } from "@testing-library/react"
import JourneyFlowDiagram, { type JourneyAuthoring, type JourneyEdge, type JourneyNode } from "@/components/JourneyFlowDiagram"
import { CODE_LINKS, codeLine, paragraph } from "@/lib/__tests__/review-samples"

const node = (overrides: Partial<JourneyNode> & Pick<JourneyNode, "id" | "label">): JourneyNode => ({
  type: "function",
  typeLabel: "Function",
  change: null,
  changedLabel: null,
  isDraft: false,
  name: "priceOf",
  shortPath: "src/price.ts",
  description: null,
  codeLinkId: null,
  codeViews: [],
  blockLists: [],
  triggerLabels: [],
  rowGroups: [],
  position: null,
  children: [],
  ...overrides,
})

const PRICE = node({
  id: "price",
  label: "Price of a line",
  change: "modified",
  changedLabel: "Modified",
  description: paragraph("Subtracts the held units."),
  codeLinkId: "src/price.ts#priceOf",
  codeViews: [
    {
      id: "price:src/price.ts",
      heading: "Code",
      countLabel: null,
      pathLabel: "src/price.ts",
      rangeLabel: "Lines 4 to 5",
      rows: [{ kind: "lines", id: "lines-4", lines: [codeLine("4", "  if (line.held > 0) {"), codeLine("5", "    return line.price - line.held", "added")] }],
      note: null,
      forgeLink: { href: "https://forge.test/blob/src/price.ts#L4-L5", label: "Open on the forge" },
    },
  ],
})

const CART_LINE = node({
  id: "cart-line",
  type: "component",
  typeLabel: "Component",
  label: "CartLine",
  name: "CartLine",
  isDraft: true,
  blockLists: [
    { kind: "argument", label: "Args", blocks: [{ id: "cart-line-on-remove", name: "onRemove", label: "onRemove", isDraft: true, change: null, lines: [[1, 1]] }] },
    { kind: "state", label: "State", blocks: [{ id: "cart-line-held", name: "held", label: "held", isDraft: true, change: "modified", lines: [[2, 2]] }, { id: "cart-line-total", name: "total", label: "The price of the line", isDraft: false, change: null, lines: [[3, 3]] }] },
  ],
  triggerLabels: [{ id: "cart-line-click", type: "render-event", typeLabel: "Event", name: "button.onClick", label: "A shopper removes the line", isDraft: false, change: null, lines: [[4, 5]] }],
  rowGroups: [
    { label: "Args", rowIds: ["cart-line-on-remove"] },
    { label: "State", rowIds: ["cart-line-held", "cart-line-total"] },
    { label: "Triggers", rowIds: ["cart-line-click"] },
  ],
  codeViews: [
    {
      id: "cart-line:src/cart-line.tsx",
      heading: "Code",
      countLabel: null,
      pathLabel: "src/cart-line.tsx",
      rangeLabel: "Lines 1 to 6",
      rows: [{ kind: "lines", id: "lines-1", lines: ["const CartLine = ({ onRemove }) => {", "  const held = useHeld()", "  const total = useTotal()", "  return <button onClick={() => {", "    onRemove() }} />", "}"].map((text, index) => codeLine(String(index + 1), text)) }],
      note: null,
      forgeLink: null,
    },
  ],
})

const NODES: readonly JourneyNode[] = [
  node({ id: "cart-page", type: "component", typeLabel: "Component", label: "Shows the cart", children: [CART_LINE] }),
  node({ id: "route", label: "Checkout endpoint" }),
  PRICE,
  node({ id: "audit", label: "Audit log", change: "added", changedLabel: "Added" }),
]

const EDGES: readonly JourneyEdge[] = [
  { id: "page-line", from: "cart-page", to: "cart-line", fromRowId: null, toRowId: null, toSide: "left" },
  { id: "line-route", from: "cart-line", to: "route", fromRowId: null, toRowId: null, toSide: "left" },
  { id: "route-price", from: "route", to: "price", fromRowId: null, toRowId: null, toSide: "left" },
  { id: "route-audit", from: "route", to: "audit", fromRowId: null, toRowId: null, toSide: "left" },
]

const NODE_PLACES: readonly Place[] = [
  { left: 24, top: 24, width: 284, height: 472 },
  { left: 34, top: 120, width: 264, height: 362 },
  { left: 404, top: 120, width: 264, height: 104 },
  { left: 764, top: 120, width: 264, height: 104 },
  { left: 764, top: 256, width: 264, height: 104 },
]

const LINE_PATHS: readonly string[] = [
  "M 308 168 L 380 168 L 404 168",
  "M 668 168 L 740 168 L 764 168",
  "M 668 168 L 740 304 L 764 304",
]

const PASSING_LINE_PATHS: readonly string[] = [
  "M 308 168 L 380 168 L 404 168",
  "M 668 168 L 740 129 L 764 129",
  "M 668 168 L 740 256 L 764 256",
  "M 308 72 L 404 72 L 668 72 L 740 111 L 764 111",
]

const ROW_LINE_PATHS: readonly string[] = [
  "M 308 320 L 380 320 L 404 320",
  "M 668 320 L 692 320 L 692 784 L 0 784 L 0 444 L 24 444",
  "M 288 320 L 308 320",
  "M 24 444 L 44 444",
]

const renderDiagram = () =>
  render(
    <JourneyFlowDiagram title="A checkout" nodes={NODES} edges={EDGES} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
  )

const boxOf = (container: HTMLElement, nodeId: string): HTMLElement | null => container.querySelector(`[data-node-id="${nodeId}"]`)

interface Place {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

const TRANSLATION = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/

const pixelsOf = (length: string | undefined): number => (length === undefined || length === "" ? 0 : Number.parseFloat(length))

const placeOf = (element: HTMLElement | null): Place => {
  const flowNode = element?.closest<HTMLElement>(".react-flow__node")
  const [, left, top] = TRANSLATION.exec(flowNode?.style.transform ?? "") ?? []
  const sized = element?.style.width === "" ? flowNode : element
  return {
    left: Number(left) + pixelsOf(element?.style.left),
    top: Number(top) + pixelsOf(element?.style.top),
    width: pixelsOf(sized?.style.width),
    height: pixelsOf(sized?.style.height),
  }
}

const linePathsOf = (container: HTMLElement): (string | null)[] => [...container.querySelectorAll("path[data-kind]")].map((path) => path.getAttribute("d"))

const menuButton = (nodeLabel: string, name: RegExp) => within(screen.getByRole("toolbar", { name: nodeLabel })).getByRole("button", { name })

describe("JourneyFlowDiagram", () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    scrollIntoView.mockClear()
    Reflect.defineProperty(Element.prototype, "scrollIntoView", { value: scrollIntoView, configurable: true })
  })

  it("draws every node with its type, at any depth, and marks the added and the modified one", () => {
    const { container } = renderDiagram()
    const board = screen.getByRole("group", { name: "A checkout" })

    expect(within(board).getByRole("button", { name: /Component.*Shows the cart/ })).toBeTruthy()
    expect(within(board).getByRole("button", { name: /CartLine.*Component/ })).toBeTruthy()
    expect(boxOf(container, "route")?.getAttribute("data-change")).toBeNull()
    expect(boxOf(container, "price")?.getAttribute("data-change")).toBe("modified")
    expect(boxOf(container, "audit")?.getAttribute("data-change")).toBe("added")
  })

  it("draws a node inside the node that holds it", () => {
    const { container } = renderDiagram()
    const page = placeOf(boxOf(container, "cart-page"))
    const line = placeOf(boxOf(container, "cart-line"))

    expect(line.left).toBeGreaterThan(page.left)
    expect(line.top).toBeGreaterThan(page.top)
    expect(line.top + line.height).toBeLessThanOrEqual(page.top + page.height)
  })

  it("sets every node where the layout places it, in columns from left to right, with the node inside another set into it", () => {
    const { container } = renderDiagram()

    expect(["cart-page", "cart-line", "route", "price", "audit"].map((nodeId) => placeOf(boxOf(container, nodeId)))).toStrictEqual(NODE_PLACES)
  })

  it("draws each line straight from the right edge of its node, bent a short way before the node it reaches so that it arrives level", () => {
    const { container } = renderDiagram()

    expect(linePathsOf(container)).toStrictEqual(LINE_PATHS)
  })

  it("carries a line that passes a column level across it, and brings the lines that reach the same node in apart from each other", () => {
    const edges: readonly JourneyEdge[] = [...EDGES, { id: "page-price", from: "cart-page", to: "price", fromRowId: null, toRowId: null, toSide: "left" }]
    const { container } = render(
      <JourneyFlowDiagram title="A checkout" nodes={NODES} edges={edges} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
    )

    expect(linePathsOf(container)).toStrictEqual(PASSING_LINE_PATHS)
  })

  it("draws one line per edge between two nodes that are not inside each other", () => {
    const { container } = renderDiagram()

    expect([...container.querySelectorAll("path[data-kind]")].map((path) => path.getAttribute("data-kind"))).toStrictEqual(["call", "call", "call"])
  })

  it("draws the line of an edge that leaves a row from that row, and ends the line of an edge that reaches a row with its arrow at that row", () => {
    const edges: readonly JourneyEdge[] = [
      { id: "held-route", from: "cart-line", to: "route", fromRowId: "cart-line-held", toRowId: null, toSide: "left" },
      { id: "route-click", from: "route", to: "cart-line", fromRowId: null, toRowId: "cart-line-click", toSide: "left" },
    ]
    const { container } = render(
      <JourneyFlowDiagram title="A checkout" nodes={NODES} edges={edges} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
    )
    const held = placeOf(screen.getByRole("button", { name: "State: held" }))
    const click = placeOf(screen.getByRole("button", { name: "Event: A shopper removes the line" }))
    const [fromNode, toNode, fromRow, toRow] = [...container.querySelectorAll("path[data-kind]")]

    expect(fromRow.getAttribute("d")?.startsWith(`M ${String(held.left + held.width)} ${String(held.top + held.height / 2)} `)).toBe(true)
    expect(toRow.getAttribute("d")?.endsWith(` ${String(click.left)} ${String(click.top + click.height / 2)}`)).toBe(true)
    expect([fromNode, toNode, fromRow, toRow].map((path) => path.hasAttribute("marker-end"))).toStrictEqual([true, false, false, true])
    expect(linePathsOf(container)).toStrictEqual(ROW_LINE_PATHS)
  })

  it("draws a trigger label as a row of its node, with what was written and the name of the code", () => {
    renderDiagram()

    const row = screen.getByRole("button", { name: "Event: A shopper removes the line" })

    expect(within(row).getByText("button.onClick")).toBeTruthy()
  })

  it("heads each node with the name of its code and its short path, apart from what is written about it", () => {
    const { container } = renderDiagram()
    const header = container.querySelector<HTMLElement>("[data-node-header=\"price\"]")

    expect(header === null ? [] : [within(header).getByText("priceOf").tagName, within(header).getByText("src/price.ts").tagName]).toStrictEqual(["SPAN", "SPAN"])
    expect(header === null ? null : within(header).queryByText("Price of a line")).toBeNull()
  })

  it("gives a written trigger label a line of its own above the name of the code, in a row taller than the row of a listed block", () => {
    renderDiagram()

    const trigger = screen.getByRole("button", { name: "Event: A shopper removes the line" })
    const listed = screen.getByRole("button", { name: "State: held" })
    const label = within(trigger).getByText("A shopper removes the line")
    const name = within(trigger).getByText("button.onClick")

    expect(label.parentElement).toBe(name.parentElement)
    expect(label.parentElement?.className).toContain("flex-col")
    expect(Number.parseFloat(trigger.style.height)).toBeGreaterThan(Number.parseFloat(listed.style.height))
  })

  it("draws a listed block with what was written about it above the name of its code, in a taller row, and an unwritten one with its name alone", () => {
    renderDiagram()

    const written = screen.getByRole("button", { name: "State: The price of the line" })
    const draft = screen.getByRole("button", { name: "State: held" })

    expect(within(written).getByText("total")).toBeTruthy()
    expect(within(draft).queryByText("The price of the line")).toBeNull()
    expect(Number.parseFloat(written.style.height)).toBeGreaterThan(Number.parseFloat(draft.style.height))
  })

  it("draws each listed block of a node as a row with its name, under one heading per kind, marks a changed one, and titles the trigger rows below them", () => {
    const { container } = renderDiagram()
    const topOf = (element: HTMLElement): number => Number.parseFloat(element.style.top)
    const [args, state, triggers] = container.querySelectorAll<HTMLElement>("[data-row-heading=\"cart-line\"]")
    const rowNamed = (name: string): HTMLElement => screen.getByRole("button", { name })
    const tops = [args, rowNamed("Args: onRemove"), state, rowNamed("State: held"), rowNamed("State: The price of the line"), triggers, rowNamed("Event: A shopper removes the line")].map(topOf)

    expect([...container.querySelectorAll("[data-row-heading]")].map((heading) => heading.textContent)).toStrictEqual(["Args", "State", "Triggers"])
    expect([...container.querySelectorAll("[data-block-id]")].map((row) => [row.getAttribute("data-block-kind"), row.textContent, row.getAttribute("data-change")])).toStrictEqual([
      ["argument", "onRemove", null],
      ["state", "held", "modified"],
      ["state", "The price of the linetotal", null],
    ])
    expect(tops).toStrictEqual([...tops].sort((one, two) => one - two))
    expect(new Set(tops).size).toBe(tops.length)
  })

  it("draws the rows of a node in the order its row groups give them, with no heading over a group that has no label", () => {
    const handler = node({
      id: "on-submit",
      type: "render-event",
      typeLabel: "Event",
      label: "Sends the form",
      blockLists: [
        { kind: "argument", label: "Args", blocks: [{ id: "on-submit-event", name: "event", label: "event", isDraft: true, change: null, lines: [[1, 1]] }] },
        { kind: "call", label: "Calls", blocks: [{ id: "on-submit-mutate", name: "createTodo.mutate", label: "createTodo.mutate", isDraft: true, change: null, lines: [[3, 3]] }] },
        { kind: "step", label: "Steps", blocks: [{ id: "on-submit-prevent", name: "event.preventDefault", label: "event.preventDefault", isDraft: true, change: null, lines: [[2, 2]] }] },
      ],
      rowGroups: [{ label: null, rowIds: ["on-submit-event", "on-submit-prevent", "on-submit-mutate"] }],
    })
    const { container } = render(
      <JourneyFlowDiagram title="A form" nodes={[handler]} edges={[]} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
    )
    const rows = [...container.querySelectorAll<HTMLElement>("[data-block-id]")]
    const inPlace = [...rows].sort((one, two) => Number.parseFloat(one.style.top) - Number.parseFloat(two.style.top))

    expect(container.querySelectorAll("[data-row-heading]").length).toBe(0)
    expect(inPlace.map((row) => row.getAttribute("data-block-id"))).toStrictEqual(["on-submit-event", "on-submit-prevent", "on-submit-mutate"])
  })

  it("opens the node of a pressed block row", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: "State: held" }))

    expect(await screen.findByRole("region", { name: "CartLine" })).toBeTruthy()
  })

  it("opens the description and the code of a pressed node, and of the node a pressed trigger belongs to", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Function.*Price of a line/ }))
    const panel = await screen.findByRole("region", { name: "Price of a line" })

    expect(within(panel).getByText("Subtracts the held units.")).toBeTruthy()
    expect(within(panel).getByRole("heading", { name: "Code" })).toBeTruthy()

    fireEvent.click(within(panel).getByRole("button", { name: "Close the code panel" }))

    expect(screen.queryByRole("region", { name: "Price of a line" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Event: A shopper removes the line" }))

    expect(await screen.findByRole("region", { name: "CartLine" })).toBeTruthy()
  })

  it("focuses the code of the panel on the lines of a pressed row, scrolled into view, and on no line when the node itself is pressed", async () => {
    renderDiagram()
    const focusedLabels = (): (string | null)[] => [...document.querySelectorAll("[data-focused=\"true\"]")].map((line) => line.getAttribute("data-line"))

    fireEvent.click(screen.getByRole("button", { name: "Event: A shopper removes the line" }))
    await screen.findByRole("region", { name: "CartLine" })

    expect(focusedLabels()).toStrictEqual(["4", "5"])
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "State: held" }))

    expect(focusedLabels()).toStrictEqual(["2"])

    fireEvent.click(screen.getByRole("button", { name: /CartLine.*Component/ }))

    expect(focusedLabels()).toStrictEqual([])
  })

  it("hides the nodes a collapsed node leads to, and shows them again when it is expanded", () => {
    const { container } = renderDiagram()

    fireEvent.click(menuButton("Checkout endpoint", /Hide the nodes this node leads to/))

    expect(boxOf(container, "price")).toBeNull()
    expect(boxOf(container, "audit")).toBeNull()
    expect(boxOf(container, "route")).not.toBeNull()

    fireEvent.click(menuButton("Checkout endpoint", /Show the nodes this node leads to again/))

    expect(boxOf(container, "price")).not.toBeNull()
  })

  it("shows only the paths through a focused node", () => {
    const { container } = renderDiagram()

    fireEvent.click(menuButton("Price of a line", /Show only the paths through this node/))

    expect(boxOf(container, "audit")).toBeNull()
    expect(boxOf(container, "cart-page")).not.toBeNull()
    expect(boxOf(container, "route")).not.toBeNull()
  })

  it("collapses every node that leads to another, and expands them all again", () => {
    const { container } = renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }))

    expect(boxOf(container, "cart-page")).not.toBeNull()
    expect(boxOf(container, "price")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }))

    expect(boxOf(container, "price")).not.toBeNull()
  })
})

const createAuthoring = (): JourneyAuthoring => ({
  isPending: false,
  onAddCard: vi.fn(),
  onClearDiagram: vi.fn(),
  onRemoveDiagram: vi.fn(),
  onAddCardAtLineEnd: vi.fn(),
  onMoveCards: vi.fn(),
  onDrawLine: vi.fn(),
  onRemoveLine: vi.fn(),
  onEditCard: vi.fn(),
  onRemoveCard: vi.fn(),
})

const renderAuthoredDiagram = (authoring: JourneyAuthoring, nodes: readonly JourneyNode[] = NODES, edges: readonly JourneyEdge[] = EDGES) =>
  render(
    <JourneyFlowDiagram title="A checkout" nodes={nodes} edges={edges} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} authoring={authoring} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
  )

const handleSelectorOf = (handleIdStart: string): string => `[data-handleid^="${handleIdStart}"]`

describe("JourneyFlowDiagram for an author", () => {
  it("asks to clear the diagram when the eraser of the toolbar is pressed", () => {
    const authoring = createAuthoring()
    renderAuthoredDiagram(authoring)

    fireEvent.click(screen.getByRole("button", { name: "Clear the diagram: delete every card" }))

    expect(authoring.onClearDiagram).toHaveBeenCalledTimes(1)
  })

  it("offers nothing to modify or delete a card to a reviewer", () => {
    renderDiagram()

    expect(screen.queryByRole("button", { name: /Modify this card/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Delete this card/ })).toBeNull()
  })

  it("asks to modify and to delete the card whose button is pressed, also a card inside another", () => {
    const authoring = createAuthoring()
    renderAuthoredDiagram(authoring)

    fireEvent.click(screen.getByRole("button", { name: "Modify this card: Price of a line" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete this card and the cards it points to: Price of a line" }))

    expect(authoring.onEditCard).toHaveBeenCalledWith("price")
    expect(authoring.onRemoveCard).toHaveBeenCalledWith("price")
    expect(screen.getAllByRole("button", { name: /Modify this card/ })).toHaveLength(NODE_PLACES.length)
  })

  it("draws a card at its stored position and the cards without one beside it", () => {
    const moved = NODES.map((one) => (one.id === "price" ? { ...one, position: { x: 40, y: 500 } } : one))
    const { container } = renderAuthoredDiagram(createAuthoring(), moved)

    expect(container.querySelector(`.react-flow__node[data-id="${PRICE.id}"]`)?.getAttribute("style")).toContain("translate(40px,500px)")
  })

  it("gives every row a place to start a line and every card three sides to end one", () => {
    const { container } = renderAuthoredDiagram(createAuthoring())

    expect(container.querySelectorAll(handleSelectorOf("side:left"))).toHaveLength(NODE_PLACES.length)
    expect(container.querySelectorAll(handleSelectorOf("side:top"))).toHaveLength(NODE_PLACES.length)
    expect(container.querySelectorAll(handleSelectorOf("side:bottom"))).toHaveLength(NODE_PLACES.length)
    expect(container.querySelectorAll(handleSelectorOf("row:")).length).toBeGreaterThan(0)
  })
})
