import { fireEvent, render, screen, within } from "@testing-library/react"
import TraceDiagram, { type CardMoving, type TraceAuthoring, type TraceEdge, type TraceNode } from "@/components/TraceDiagram"
import { typeIconOf } from "@/components/TraceDiagram/type-icons"
import { findNavigatorButton, renderInNavigator, SECTION_ANCHOR_ID } from "@/lib/__tests__/navigator-harness"
import { CODE_LINKS, codeLine, paragraph } from "@/lib/__tests__/review-samples"
import { ZOOM_STEP } from "@/lib/board-zoom"
import { NODE_HEAD_HEIGHT, NODE_WIDTH } from "@/lib/trace-layout"

const node = (overrides: Partial<TraceNode> & Pick<TraceNode, "id" | "label">): TraceNode => ({
  type: "function",
  typeLabel: "Function",
  change: null,
  changedLabel: null,
  isDraft: false,
  classification: { key: "logic", label: "Plain logic" },
  hint: null,
  isBeingWritten: false,
  name: "priceOf",
  shortPath: "src/price.ts",
  description: null,
  codeLinkId: null,
  codeViews: [],
  parameters: [],
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
      rows: [{ kind: "lines", id: "lines-4", lines: [codeLine("4", "  if (line.held > 0) {"), codeLine("5", "    return line.price - line.held", "added")], collapses: [] }],
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
    { label: "Args", rowIds: ["cart-line-on-remove"], childIds: [] },
    { label: "State", rowIds: ["cart-line-held", "cart-line-total"], childIds: [] },
    { label: "Triggers", rowIds: ["cart-line-click"], childIds: [] },
  ],
  codeViews: [
    {
      id: "cart-line:src/cart-line.tsx",
      heading: "Code",
      countLabel: null,
      pathLabel: "src/cart-line.tsx",
      rangeLabel: "Lines 1 to 6",
      rows: [{ kind: "lines", id: "lines-1", lines: ["const CartLine = ({ onRemove }) => {", "  const held = useHeld()", "  const total = useTotal()", "  return <button onClick={() => {", "    onRemove() }} />", "}"].map((text, index) => codeLine(String(index + 1), text)), collapses: [] }],
      note: null,
      forgeLink: null,
    },
  ],
})

const NODES: readonly TraceNode[] = [
  node({ id: "cart-page", type: "component", typeLabel: "Component", label: "Shows the cart", children: [CART_LINE] }),
  node({ id: "route", label: "Checkout endpoint" }),
  PRICE,
  node({ id: "audit", label: "Audit log", change: "added", changedLabel: "Added" }),
]

const EDGES: readonly TraceEdge[] = [
  { id: "page-line", from: "cart-page", to: "cart-line", fromRowId: null, toRowId: null, toSide: "left" },
  { id: "line-route", from: "cart-line", to: "route", fromRowId: null, toRowId: null, toSide: "left" },
  { id: "route-price", from: "route", to: "price", fromRowId: null, toRowId: null, toSide: "left" },
  { id: "route-audit", from: "route", to: "audit", fromRowId: null, toRowId: null, toSide: "left" },
]

const NODE_PLACES: readonly Place[] = [
  { left: 24, top: 24, width: 284, height: 504 },
  { left: 34, top: 136, width: 264, height: 378 },
  { left: 404, top: 136, width: 264, height: 120 },
  { left: 764, top: 60, width: 264, height: 120 },
  { left: 764, top: 212, width: 264, height: 120 },
]

const LINE_PATHS: readonly string[] = [
  "M 308 192 L 380 192 L 404 192",
  "M 668 192 L 740 116 L 764 116",
  "M 668 192 L 740 268 L 764 268",
]

const PASSING_LINE_PATHS: readonly string[] = [
  "M 308 192 L 380 192 L 404 192",
  "M 668 192 L 740 97 L 764 97",
  "M 668 192 L 740 240 L 764 240",
  "M 308 80 L 404 80 L 668 80 L 740 79 L 764 79",
]

const ROW_LINE_PATHS: readonly string[] = [
  "M 308 352 L 380 352 L 404 352",
  "M 668 352 L 692 352 L 692 848 L 0 848 L 0 476 L 24 476",
  "M 288 352 L 308 352",
  "M 24 476 L 44 476",
]

const renderDiagram = () =>
  render(
    <TraceDiagram title="A checkout" nodes={NODES} edges={EDGES} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
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

describe("TraceDiagram", () => {
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
    const edges: readonly TraceEdge[] = [...EDGES, { id: "page-price", from: "cart-page", to: "price", fromRowId: null, toRowId: null, toSide: "left" }]
    const { container } = render(
      <TraceDiagram title="A checkout" nodes={NODES} edges={edges} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
    )

    expect(linePathsOf(container)).toStrictEqual(PASSING_LINE_PATHS)
  })

  it("draws one line per edge between two nodes that are not inside each other", () => {
    const { container } = renderDiagram()

    expect([...container.querySelectorAll("path[data-kind]")].map((path) => path.getAttribute("data-kind"))).toStrictEqual(["call", "call", "call"])
  })

  it("draws the line of an edge that leaves a row from that row, and ends the line of an edge that reaches a row with its arrow at that row", () => {
    const edges: readonly TraceEdge[] = [
      { id: "held-route", from: "cart-line", to: "route", fromRowId: "cart-line-held", toRowId: null, toSide: "left" },
      { id: "route-click", from: "route", to: "cart-line", fromRowId: null, toRowId: "cart-line-click", toSide: "left" },
    ]
    const { container } = render(
      <TraceDiagram title="A checkout" nodes={NODES} edges={edges} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
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

  it("heads each node with the name of its code alone, apart from what is written about it and its short path", () => {
    const { container } = renderDiagram()
    const header = container.querySelector<HTMLElement>("[data-node-header=\"price\"]")

    expect(header === null ? null : within(header).getByText("priceOf").tagName).toBe("SPAN")
    expect(header === null ? null : within(header).queryByText("src/price.ts")).toBeNull()
    expect(header === null ? null : within(header).queryByText("Price of a line")).toBeNull()
  })

  it("puts the short path of a node on the last line of its head, under what is written about it, titled with the whole path", () => {
    const { container } = renderDiagram()
    const path = container.querySelector<HTMLElement>("[data-node-path=\"price\"]")
    const body = path?.parentElement ?? null

    expect(path?.textContent).toBe("src/price.ts")
    expect(path?.title).toBe("src/price.ts")
    expect(body?.lastElementChild).toBe(path)
    expect(body === null ? null : within(body).getByText("Price of a line")).toBeTruthy()
    expect(body?.previousElementSibling?.getAttribute("data-node-header")).toBe("price")
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
      rowGroups: [{ label: null, rowIds: ["on-submit-event", "on-submit-prevent", "on-submit-mutate"], childIds: [] }],
    })
    const { container } = render(
      <TraceDiagram title="A form" nodes={[handler]} edges={[]} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
    )
    const rows = [...container.querySelectorAll<HTMLElement>("[data-block-id]")]
    const inPlace = [...rows].sort((one, two) => Number.parseFloat(one.style.top) - Number.parseFloat(two.style.top))

    expect(container.querySelectorAll("[data-row-heading]").length).toBe(0)
    expect(inPlace.map((row) => row.getAttribute("data-block-id"))).toStrictEqual(["on-submit-event", "on-submit-prevent", "on-submit-mutate"])
  })

  it("draws a function card with argument rows, its calls in a card per callee and its returns and raises, and leaves a line from the call row it names", () => {
    const listed = (id: string, name: string, label: string) => ({ id, name, label, isDraft: false, hint: null, change: null, lines: [[1, 1]] as const })
    const rename = node({
      id: "rename",
      label: "Renames a trainer",
      name: "rename_trainer",
      blockLists: [
        { kind: "argument", label: "Arguments", blocks: [listed("rename-id", "trainer_id", "trainer_id: int")] },
        { kind: "call", label: "Calls", blocks: [listed("rename@3:5", "load_trainers", "Calls load_trainers to read every trainer"), listed("rename@9:5", "load_trainers", "Calls load_trainers when the cache is cold to read them again")] },
        { kind: "return", label: "Returns", blocks: [listed("rename@12:5", "return", "Returns the renamed trainer")] },
        { kind: "throw", label: "Raises", blocks: [listed("rename-raise", "raise LookupError", "Raises LookupError when no trainer has the id")] },
      ],
      rowGroups: [
        { label: "Arguments", rowIds: ["rename-id"], childIds: [] },
        { label: "External calls", rowIds: [], childIds: [], calleeCards: [{ id: "store#load_trainers", name: "load_trainers", type: "function", typeLabel: "Function", change: "added", changedLabel: "Added", rowIds: ["rename@3:5", "rename@9:5"] }] },
        { label: "Returns and raises", rowIds: ["rename-raise", "rename@12:5"], childIds: [] },
      ],
    })
    const load = node({ id: "load", label: "Loads the trainers", name: "load_trainers" })
    const edges: readonly TraceEdge[] = [{ id: "rename-load", from: "rename", to: "load", fromRowId: "rename@9:5", toRowId: null, toSide: "left" }]
    const { container } = render(
      <TraceDiagram title="A rename" nodes={[rename, load]} edges={edges} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
    )
    const callee = container.querySelector<HTMLElement>("[data-callee-card=\"store#load_trainers\"]")
    const calleePlace = placeOf(callee)
    const [first, second] = ["Calls: Calls load_trainers to read every trainer", "Calls: Calls load_trainers when the cache is cold to read them again"].map((name) => screen.getByRole("button", { name }))
    const argument = screen.getByRole("button", { name: "Arguments: trainer_id: int" })
    const raise = screen.getByRole("button", { name: "Raises: Raises LookupError when no trainer has the id" })
    const leaving = placeOf(second)

    expect([...container.querySelectorAll("[data-row-heading=\"rename\"]")].map((heading) => heading.textContent)).toStrictEqual(["Arguments", "External calls", "Returns and raises"])
    expect(callee === null ? null : [within(callee).getByText("load_trainers").tagName, within(callee).getByText("Function").tagName, within(callee).getByText("Added").tagName]).toStrictEqual(["SPAN", "SPAN", "SPAN"])
    expect([first, second].map(placeOf).every((place) => place.left > calleePlace.left && place.top > calleePlace.top && place.left + place.width < calleePlace.left + calleePlace.width && place.top + place.height < calleePlace.top + calleePlace.height)).toBe(true)
    expect(within(argument).getByText("trainer_id: int").className).toContain("font-mono")
    expect(Number.parseFloat(argument.style.height)).toBeLessThan(Number.parseFloat(first.style.height))
    expect(within(first).getByText("Calls load_trainers to read every trainer").className).toContain("line-clamp-2")
    expect(raise.querySelector("svg")?.getAttribute("class")).toContain("text-destructive")
    expect(linePathsOf(container).filter((path) => path?.startsWith(`M ${String(leaving.left + leaving.width)} ${String(leaving.top + leaving.height / 2)} `) === true)).toHaveLength(1)
  })

  it("names a card's classification after its type, unless they are the same", () => {
    const nodes = [
      node({ id: "save", label: "Saves the order", classification: { key: "database-write", label: "Database write" } }),
      node({ id: "price-of", label: "Prices the line", name: "linePrice", classification: { key: "function", label: "Function" } }),
    ]
    const { container } = render(<TraceDiagram title="Orders" nodes={nodes} edges={[]} codeLinks={{}} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />)

    expect(within(boxOf(container, "save") ?? document.body).getByText("Database write")).toBeTruthy()
    expect(within(boxOf(container, "price-of") ?? document.body).getAllByText("Function")).toHaveLength(1)
  })

  it("shows Flight Plan's hint in place of the label of a card that has none", () => {
    const nodes = [node({ id: "cart-line", label: "CartLine", isDraft: true, hint: "Adds a component." })]
    const { container } = render(<TraceDiagram title="Cart" nodes={nodes} edges={[]} codeLinks={{}} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />)

    expect(within(boxOf(container, "cart-line") ?? document.body).getByText("Adds a component.")).toBeTruthy()
  })

  it("says in the side panel that a card has no write-up, and asks for one with the button and with G", async () => {
    const onWriteUpNode = vi.fn()
    const nodes = [node({ id: "cart-line", label: "CartLine", isDraft: true, hint: "Adds a component." })]
    renderInNavigator(
      <TraceDiagram
        title="Cart"
        nodes={nodes}
        edges={[]}
        codeLinks={{}}
        codeDefinitions={{}}
        isReviewPending={false}
        navigatorAnchorId={SECTION_ANCHOR_ID}
        onWriteUpNode={onWriteUpNode}
        onOpenCodeLink={vi.fn()}
        onWaypointReviewedChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /^priceOf/ }))
    const panel = await screen.findByRole("region", { name: "CartLine" })

    expect(within(panel).getByText("Not explained yet.")).toBeTruthy()

    fireEvent.click(within(panel).getByRole("button", { name: /Explain this card/ }))
    await findNavigatorButton("Explain this card")
    fireEvent.keyDown(document.body, { key: "g" })

    expect(onWriteUpNode.mock.calls).toStrictEqual([["cart-line"], ["cart-line"]])
  })

  it("draws skeleton lines in the side panel while the agent writes the card, and offers no write-up then", async () => {
    const nodes = [node({ id: "cart-line", label: "CartLine", isDraft: true, isBeingWritten: true })]
    render(<TraceDiagram title="Cart" nodes={nodes} edges={[]} codeLinks={{}} codeDefinitions={{}} isReviewPending={false} onWriteUpNode={vi.fn()} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: /^priceOf/ }))
    const panel = await screen.findByRole("region", { name: "CartLine" })

    expect(within(panel).getByText("The agent is explaining this card.")).toBeTruthy()
    expect(panel.querySelector("[data-unwritten]")).not.toBeNull()
    expect(within(panel).queryByRole("button", { name: /Explain this card/ })).toBeNull()
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

  it("opens on the page, not full screen", () => {
    renderDiagram()

    expect(screen.queryByRole("dialog", { name: "A checkout" })).toBeNull()
  })

  it("opens full screen with no node open when asked to, and opens the side panel of a pressed node", async () => {
    render(
      <TraceDiagram
        title="A checkout"
        nodes={NODES}
        edges={EDGES}
        codeLinks={CODE_LINKS}
        codeDefinitions={{}}
        isReviewPending={false}
        isFullScreenAtStart
        onOpenCodeLink={vi.fn()}
        onWaypointReviewedChange={vi.fn()}
      />,
    )
    const board = await screen.findByRole("dialog", { name: "A checkout" })

    expect(within(board).queryByRole("region", { name: "Price of a line" })).toBeNull()

    fireEvent.click(within(board).getByRole("button", { name: /Function.*Price of a line/ }))

    expect(await within(board).findByRole("region", { name: "Price of a line" })).toBeTruthy()
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

  it("collapses every node that leads to another from the navigator, and expands them all again", async () => {
    const { container } = renderInNavigator(
      <TraceDiagram
        title="A checkout"
        nodes={NODES}
        edges={EDGES}
        codeLinks={CODE_LINKS}
        codeDefinitions={{}}
        isReviewPending={false}
        navigatorAnchorId={SECTION_ANCHOR_ID}
        onOpenCodeLink={vi.fn()}
        onWaypointReviewedChange={vi.fn()}
      />,
    )

    fireEvent.click(await findNavigatorButton("Collapse all"))

    expect(boxOf(container, "cart-page")).not.toBeNull()
    expect(boxOf(container, "price")).toBeNull()

    fireEvent.click(await findNavigatorButton("Expand all"))

    expect(boxOf(container, "price")).not.toBeNull()
  })
})

const createAuthoring = (): TraceAuthoring => ({
  isPending: false,
  onAddCard: vi.fn(),
  onClearDiagram: vi.fn(),
  onRemoveDiagram: vi.fn(),
  onAddCardAtLineEnd: vi.fn(),
  onDrawLine: vi.fn(),
  onRemoveLine: vi.fn(),
  onEditCard: vi.fn(),
  onRemoveCard: vi.fn(),
})

const renderAuthoredDiagram = (authoring: TraceAuthoring, nodes: readonly TraceNode[] = NODES, edges: readonly TraceEdge[] = EDGES) =>
  render(
    <TraceDiagram title="A checkout" nodes={nodes} edges={edges} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} authoring={authoring} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
  )

const handleSelectorOf = (handleIdStart: string): string => `[data-handleid^="${handleIdStart}"]`

describe("TraceDiagram for an author", () => {
  it("adds a card with C, and asks before it clears the diagram with K or removes it with L, from the review navigator", async () => {
    const authoring = createAuthoring()
    renderInNavigator(
      <TraceDiagram title="A checkout" nodes={NODES} edges={EDGES} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} authoring={authoring} navigatorAnchorId={SECTION_ANCHOR_ID} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
    )
    await findNavigatorButton("Clear diagram")

    fireEvent.keyDown(document.body, { key: "c" })
    fireEvent.keyDown(document.body, { key: "k" })
    const clearing = await screen.findByRole("dialog", { name: "Clear this diagram?" })

    expect(authoring.onAddCard).toHaveBeenCalledTimes(1)
    expect(authoring.onClearDiagram).not.toHaveBeenCalled()

    fireEvent.click(within(clearing).getByRole("button", { name: "Clear diagram" }))
    expect(screen.queryByRole("dialog", { name: "Clear this diagram?" })).toBeNull()

    fireEvent.keyDown(document.body, { key: "l" })
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Remove this diagram?" })).getByRole("button", { name: "Cancel" }))

    expect(authoring.onClearDiagram).toHaveBeenCalledTimes(1)
    expect(authoring.onRemoveDiagram).not.toHaveBeenCalled()
  })

  it("keeps the author's actions off the board", () => {
    renderAuthoredDiagram(createAuthoring())

    expect(screen.queryByRole("button", { name: "Add card" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Clear diagram" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Remove diagram" })).toBeNull()
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

  it("shows the parameters of a card as chips under its head, above its rows, and makes the card taller for them", () => {
    const parameters = ["session: Session", "trainer_id: int | None"]
    const withParameters = NODES.map((one) => (one.id === "price" ? { ...one, parameters } : one))
    const { container } = render(
      <TraceDiagram title="A checkout" nodes={withParameters} edges={EDGES} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
    )
    const chips = screen.getByRole("list", { name: "Parameters" })
    const price = placeOf(boxOf(container, "price"))
    const listed = placeOf(chips)

    expect(within(chips).getAllByRole("listitem").map((chip) => chip.textContent)).toStrictEqual(parameters)
    expect(listed.top).toBeGreaterThanOrEqual(price.top + NODE_HEAD_HEIGHT)
    expect(price.height).toBeGreaterThan(NODE_PLACES[3].height)
  })

  it("lets a reader with card moving drag every top card, and nobody else", () => {
    const draggableIdsOf = (container: HTMLElement): (string | null)[] =>
      [...container.querySelectorAll(".react-flow__node.draggable")].map((card) => card.getAttribute("data-id"))
    const moving = render(
      <TraceDiagram title="A checkout" nodes={NODES} edges={EDGES} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} cardMoving={{ onMoveCards: vi.fn(), onResizeCard: vi.fn() }} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
    )

    expect(draggableIdsOf(moving.container)).toStrictEqual(["cart-page", "route", "price", "audit"])
    moving.unmount()
    expect(draggableIdsOf(renderDiagram().container)).toStrictEqual([])
  })

  it("gives every row a place to start a line and every card three sides to end one", () => {
    const { container } = renderAuthoredDiagram(createAuthoring())

    expect(container.querySelectorAll(handleSelectorOf("side:left"))).toHaveLength(NODE_PLACES.length)
    expect(container.querySelectorAll(handleSelectorOf("side:top"))).toHaveLength(NODE_PLACES.length)
    expect(container.querySelectorAll(handleSelectorOf("side:bottom"))).toHaveLength(NODE_PLACES.length)
    expect(container.querySelectorAll(handleSelectorOf("row:")).length).toBeGreaterThan(0)
  })

  it("marks each card, each of its rows and the side panel of a pressed node as that node of the trace", async () => {
    render(
      <TraceDiagram
        title="A checkout"
        nodes={NODES}
        edges={EDGES}
        codeLinks={CODE_LINKS}
        codeDefinitions={{}}
        isReviewPending={false}
        isFullScreenAtStart
        onOpenCodeLink={vi.fn()}
        onWaypointReviewedChange={vi.fn()}
      />,
    )
    const board = await screen.findByRole("dialog", { name: "A checkout" })
    const row = within(board).getByRole("button", { name: "Event: A shopper removes the line" })

    expect(row.dataset).toMatchObject({ artifactPart: "trace-node", artifactId: "cart-line" })
    expect(board.querySelector("[data-node-id=price]")?.getAttribute("data-artifact-id")).toBe("price")

    fireEvent.click(within(board).getByRole("button", { name: /Function.*Price of a line/ }))

    expect((await within(board).findByRole("region", { name: "Price of a line" })).dataset).toMatchObject({ artifactPart: "trace-node", artifactId: "price" })
  })
})

const RESIZE_GRIP_NAME = "Drag to change the width of this card"

const createCardMoving = (): CardMoving => ({ onMoveCards: vi.fn(), onResizeCard: vi.fn() })

const renderMovableDiagram = (cardMoving: CardMoving, nodes: readonly TraceNode[] = NODES) =>
  render(
    <TraceDiagram title="A checkout" nodes={nodes} edges={EDGES} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} cardMoving={cardMoving} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
  )

const gripOf = (container: HTMLElement, nodeId: string): HTMLElement => {
  const box = boxOf(container, nodeId)
  if (box === null) throw new Error(`No card ${nodeId}`)
  return within(box).getByRole("separator", { name: RESIZE_GRIP_NAME })
}

const dragGrip = (grip: HTMLElement, distance: number) => {
  const startX = 100
  fireEvent.pointerDown(grip, { pointerId: 1, clientX: startX })
  fireEvent.pointerMove(grip, { pointerId: 1, clientX: startX + distance })
  fireEvent.pointerUp(grip, { pointerId: 1, clientX: startX + distance })
  fireEvent.click(grip)
}

describe("TraceDiagram card resizing", () => {
  beforeEach(() => {
    Reflect.defineProperty(Element.prototype, "setPointerCapture", { value: vi.fn(), configurable: true, writable: true })
  })

  it("gives every top card a grip on its right edge for a reader with card moving, and nobody else", () => {
    const moving = renderMovableDiagram(createCardMoving())

    expect(screen.getAllByRole("separator", { name: RESIZE_GRIP_NAME })).toHaveLength(4)
    expect(within(boxOf(moving.container, "cart-line") ?? document.body).queryByRole("separator", { name: RESIZE_GRIP_NAME })).toBeNull()
    moving.unmount()
    renderAuthoredDiagram(createAuthoring())
    expect(screen.queryAllByRole("separator", { name: RESIZE_GRIP_NAME })).toStrictEqual([])
  })

  it("widens the card while its grip is dragged, leaves the other cards of its column as they are, and saves the whole width on release without selecting the card", () => {
    const cardMoving = createCardMoving()
    const { container } = renderMovableDiagram(cardMoving)
    const grip = gripOf(container, "price")

    fireEvent.pointerDown(grip, { pointerId: 1, clientX: 100 })
    fireEvent.pointerMove(grip, { pointerId: 1, clientX: 160.4 })

    expect(placeOf(boxOf(container, "price")).width).toBeCloseTo(NODE_WIDTH + 60.4)
    expect(placeOf(boxOf(container, "audit")).width).toBe(NODE_WIDTH)

    fireEvent.pointerUp(grip, { pointerId: 1, clientX: 160.4 })
    fireEvent.click(grip)

    expect(cardMoving.onResizeCard).toHaveBeenCalledWith("price", NODE_WIDTH + 60)
    expect(cardMoving.onMoveCards).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("keeps a dragged width between the width of a node and the widest a card can be", () => {
    const cardMoving = createCardMoving()
    const { container } = renderMovableDiagram(cardMoving)

    dragGrip(gripOf(container, "price"), -200)
    dragGrip(gripOf(container, "route"), 2000)

    expect(cardMoving.onResizeCard).toHaveBeenNthCalledWith(1, "price", NODE_WIDTH)
    expect(cardMoving.onResizeCard).toHaveBeenNthCalledWith(2, "route", 720)
  })

  it("turns the distance dragged on screen into the distance on the board, at the zoom of the board", () => {
    const cardMoving = createCardMoving()
    const { container } = renderMovableDiagram(cardMoving)

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))
    dragGrip(gripOf(container, "price"), 100)

    expect(cardMoving.onResizeCard).toHaveBeenCalledWith("price", NODE_WIDTH + 100 / ZOOM_STEP)
  })

  it("draws a card at its stored width", () => {
    const resized = NODES.map((one) => (one.id === "price" ? { ...one, width: 400 } : one))
    const { container } = renderMovableDiagram(createCardMoving(), resized)

    expect(placeOf(boxOf(container, "price")).width).toBe(400)
    expect(placeOf(boxOf(container, "audit")).width).toBe(NODE_WIDTH)
  })
})

const BLOCK_TYPES = [
  "function", "method", "hook", "component", "class", "root-variable", "root-statement", "type-declaration", "import", "directive", "file",
  "condition", "switch", "switch-case", "loop", "try-catch", "throw", "call", "effect", "component-effect", "effect-callback", "code-event",
  "route", "resolver", "middleware", "render", "render-condition", "render-loop", "render-event", "render-root", "state", "derived", "data",
  "data-fetch", "cache", "auth", "request", "navigation", "publish", "validation", "config", "feature-flag", "storage", "telemetry",
  "transaction", "external-value", "root-argument-value", "variable", "property", "deleted",
]

describe("typeIconOf", () => {
  it("gives every type of block an icon of its own, apart from the icon of a type it does not know", () => {
    const icons = BLOCK_TYPES.map(typeIconOf)

    expect(new Set(icons).size).toBe(BLOCK_TYPES.length)
    expect(icons).not.toContain(typeIconOf("unknown-type"))
  })
})
