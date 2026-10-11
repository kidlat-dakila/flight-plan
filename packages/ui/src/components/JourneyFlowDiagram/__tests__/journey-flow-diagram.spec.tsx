import { fireEvent, render, screen, within } from "@testing-library/react"
import JourneyFlowDiagram, { type JourneyEdge, type JourneyNode } from "@/components/JourneyFlowDiagram"
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
    { kind: "argument", label: "Args", blocks: [{ id: "cart-line-on-remove", name: "onRemove", change: null, lines: [[1, 1]] }] },
    { kind: "state", label: "State", blocks: [{ id: "cart-line-held", name: "held", change: "modified", lines: [[2, 2]] }, { id: "cart-line-total", name: "total", change: null, lines: [[3, 3]] }] },
  ],
  triggerLabels: [{ id: "cart-line-click", type: "render-event", typeLabel: "Event", name: "button.onClick", label: "A shopper removes the line", isDraft: false, change: null, lines: [[4, 5]] }],
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
  { id: "page-line", from: "cart-page", to: "cart-line", fromRowId: null, toRowId: null },
  { id: "line-route", from: "cart-line", to: "route", fromRowId: null, toRowId: null },
  { id: "route-price", from: "route", to: "price", fromRowId: null, toRowId: null },
  { id: "route-audit", from: "route", to: "audit", fromRowId: null, toRowId: null },
]

const renderDiagram = () =>
  render(
    <JourneyFlowDiagram title="A checkout" nodes={NODES} edges={EDGES} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
  )

const boxOf = (container: HTMLElement, nodeId: string): HTMLElement | null => container.querySelector(`[data-node-id="${nodeId}"]`)

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
    const page = boxOf(container, "cart-page")
    const line = boxOf(container, "cart-line")
    const numberOf = (element: HTMLElement | null, property: "left" | "top" | "width" | "height"): number => Number.parseFloat(element?.style[property] ?? "")

    expect(numberOf(line, "left")).toBeGreaterThan(numberOf(page, "left"))
    expect(numberOf(line, "top")).toBeGreaterThan(numberOf(page, "top"))
    expect(numberOf(line, "top") + numberOf(line, "height")).toBeLessThanOrEqual(numberOf(page, "top") + numberOf(page, "height"))
  })

  it("draws one line per edge between two nodes that are not inside each other", () => {
    const { container } = renderDiagram()

    expect([...container.querySelectorAll("path[data-kind]")].map((path) => path.getAttribute("data-kind"))).toStrictEqual(["call", "call", "call"])
  })

  it("draws the line of an edge that leaves a row from that row, and ends the line of an edge that reaches a row with its arrow at that row", () => {
    const edges: readonly JourneyEdge[] = [
      { id: "held-route", from: "cart-line", to: "route", fromRowId: "cart-line-held", toRowId: null },
      { id: "route-click", from: "route", to: "cart-line", fromRowId: null, toRowId: "cart-line-click" },
    ]
    const { container } = render(
      <JourneyFlowDiagram title="A checkout" nodes={NODES} edges={edges} codeLinks={CODE_LINKS} codeDefinitions={{}} isReviewPending={false} onOpenCodeLink={vi.fn()} onWaypointReviewedChange={vi.fn()} />,
    )
    const numberOf = (element: HTMLElement, property: "left" | "top" | "width" | "height"): number => Number.parseFloat(element.style[property])
    const held = screen.getByRole("button", { name: "State: held" })
    const click = screen.getByRole("button", { name: "Event: A shopper removes the line" })
    const [fromNode, toNode, fromRow, toRow] = [...container.querySelectorAll("path[data-kind]")]

    expect(fromRow.getAttribute("d")?.startsWith(`M ${String(numberOf(held, "left") + numberOf(held, "width"))} ${String(numberOf(held, "top") + numberOf(held, "height") / 2)} `)).toBe(true)
    expect(toRow.getAttribute("d")?.endsWith(` ${String(numberOf(click, "left"))} ${String(numberOf(click, "top") + numberOf(click, "height") / 2)}`)).toBe(true)
    expect([fromNode, toNode, fromRow, toRow].map((path) => path.hasAttribute("marker-end"))).toStrictEqual([true, false, false, true])
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

  it("draws each listed block of a node as a row with its name, under one heading per kind, marks a changed one, and titles the trigger rows below them", () => {
    const { container } = renderDiagram()
    const topOf = (element: HTMLElement): number => Number.parseFloat(element.style.top)
    const [args, state, triggers] = container.querySelectorAll<HTMLElement>("[data-row-heading=\"cart-line\"]")
    const rowNamed = (name: string): HTMLElement => screen.getByRole("button", { name })
    const tops = [args, rowNamed("Args: onRemove"), state, rowNamed("State: held"), rowNamed("State: total"), triggers, rowNamed("Event: A shopper removes the line")].map(topOf)

    expect([...container.querySelectorAll("[data-row-heading]")].map((heading) => heading.textContent)).toStrictEqual(["Args", "State", "Triggers"])
    expect([...container.querySelectorAll("[data-block-id]")].map((row) => [row.getAttribute("data-block-kind"), row.textContent, row.getAttribute("data-change")])).toStrictEqual([
      ["argument", "onRemove", null],
      ["state", "held", "modified"],
      ["state", "total", null],
    ])
    expect(tops).toStrictEqual([...tops].sort((one, two) => one - two))
    expect(new Set(tops).size).toBe(tops.length)
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
