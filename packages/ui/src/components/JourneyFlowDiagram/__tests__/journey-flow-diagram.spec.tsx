import { fireEvent, render, screen, within } from "@testing-library/react"
import JourneyFlowDiagram, { type JourneyEdge, type JourneyNode, type UiCard } from "@/components/JourneyFlowDiagram"
import { CODE_LINKS, paragraph } from "@/lib/__tests__/review-samples"

const node = (overrides: Partial<JourneyNode> & Pick<JourneyNode, "id" | "kind" | "label">): JourneyNode => ({
  x: 0,
  y: 0,
  width: 264,
  height: 92,
  change: null,
  category: "logic",
  kindLabel: "Logic",
  changedLabel: null,
  isDraft: false,
  sublabel: "src/price.ts",
  description: null,
  codeLinkId: null,
  tracedCode: null,
  tracedHeading: null,
  isInsideCard: false,
  ...overrides,
})

const NODES: readonly JourneyNode[] = [
  node({ id: "click", kind: "entry-point", label: "Customer clicks Checkout", category: null, kindLabel: "Entry point", sublabel: null }),
  node({ id: "search", kind: "entry-point", label: "Customer searches", category: null, kindLabel: "Entry point", sublabel: null, x: 300 }),
  node({ id: "route", kind: "code", label: "Checkout endpoint", y: 120 }),
  node({ id: "audit", kind: "code", label: "Audit log", x: 600, y: 120, codeLinkId: "src/price.ts#priceOf" }),
  node({ id: "results", kind: "code", label: "Search results", x: 300, y: 120, change: "added", changedLabel: "Added" }),
  node({
    id: "price",
    kind: "code",
    change: "modified",
    label: "Price of a line",
    y: 260,
    changedLabel: "Modified",
    tracedCode: {
      pathLabel: "src/price.ts",
      rangeLabel: "Lines 4 to 5, 2 lines",
      lines: [
        { numberLabel: "4", mark: "context", isFocused: false, tokens: [{ text: "  if (line.held > 0) {", kind: "plain" }] },
        { numberLabel: "5", mark: "added", isFocused: false, tokens: [{ text: "    return line.price - line.held", kind: "plain" }] },
      ],
      anchorId: null,
      forgeLink: { href: "https://forge.test/blob/src/price.ts#L4-L5", label: "Open on the forge" },
    },
    tracedHeading: "Traced lines",
    description: paragraph("Subtracts the held units."),
    codeLinkId: "src/price.ts#priceOf",
  }),
]

const EDGES: readonly JourneyEdge[] = [
  { id: "a", from: "click", to: "route", points: [{ x: 10, y: 10 }, { x: 10, y: 120 }], isInsideCard: false },
  { id: "b", from: "route", to: "price", points: [{ x: 10, y: 212 }, { x: 10, y: 260 }], isInsideCard: false },
  { id: "d", from: "route", to: "audit", points: [{ x: 264, y: 160 }, { x: 600, y: 160 }], isInsideCard: false },
  { id: "c", from: "search", to: "results", points: [{ x: 310, y: 52 }, { x: 310, y: 120 }], isInsideCard: false },
]

const renderDiagram = () =>
  render(
    <JourneyFlowDiagram title="A checkout" width={320} height={380} nodes={NODES} uiCards={[]} edges={EDGES} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />,
  )

const nodeButton = (name: RegExp) => screen.getAllByRole("button", { name }).find((button) => button.hasAttribute("data-kind"))

const menuButton = (nodeLabel: string, name: string) =>
  within(screen.getByRole("toolbar", { name: nodeLabel })).getByRole("button", { name })

describe("JourneyFlowDiagram", () => {
  it("draws every node with its kind, and marks the added and the modified one", () => {
    renderDiagram()

    const board = screen.getByRole("group", { name: "A checkout" })

    expect(within(board).getByRole("button", { name: /Entry point:\s*Customer clicks Checkout/ })).toBeTruthy()
    expect(within(board).getByRole("button", { name: /Checkout endpoint/ }).getAttribute("data-change")).toBeNull()
    expect(within(board).getByRole("button", { name: /Modified.*Price of a line/ }).getAttribute("data-change")).toBe("modified")
    expect(within(board).getByRole("button", { name: /Added.*Search results/ }).getAttribute("data-change")).toBe("added")
  })

  it("draws one edge per connection, each as the same plain line", () => {
    const { container } = renderDiagram()
    const lines = [...container.querySelectorAll("path[data-kind]")]

    expect(lines.map((path) => [path.getAttribute("data-kind"), path.getAttribute("data-assumed")])).toStrictEqual([
      ["call", "false"],
      ["call", "false"],
      ["call", "false"],
      ["call", "false"],
    ])
  })

  it("opens full screen with the node's description when a node is pressed", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Price of a line/ }))

    const panel = await screen.findByRole("region", { name: "Price of a line" })

    expect(within(panel).getByText("Subtracts the held units.")).toBeTruthy()

    fireEvent.click(within(panel).getByRole("button", { name: "Close the code panel" }))

    expect(screen.queryByRole("region", { name: "Price of a line" })).toBeNull()
  })

  it("heads the traced lines of a pressed node that has some", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Price of a line/ }))
    const panel = await screen.findByRole("region", { name: "Price of a line" })

    expect(within(panel).getByRole("heading", { name: "Traced lines" })).toBeTruthy()
  })

  it("refers to the code of a pressed node by its file, its traced lines and a link to the forge, not by its whole declaration", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Price of a line/ }))
    const panel = await screen.findByRole("region", { name: "Price of a line" })
    const code = within(panel).getByRole("group", { name: "src/price.ts, Lines 4 to 5, 2 lines" })

    expect([...code.querySelectorAll("[data-line]")].map((row) => row.getAttribute("data-line"))).toStrictEqual(["4", "5"])
    expect(within(panel).getByText("Lines 4 to 5, 2 lines")).toBeTruthy()
    expect(within(panel).getByRole("link", { name: /Open on the forge/ }).getAttribute("href")).toBe("https://forge.test/blob/src/price.ts#L4-L5")
    expect(within(panel).queryByText("export const priceOf = () => 1")).toBeNull()
  })

  it("shows the whole declaration of a node that has no traced lines", async () => {
    renderDiagram()
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }))

    fireEvent.click(screen.getByRole("button", { name: /Audit log/ }))
    const panel = await screen.findByRole("region", { name: "Audit log" })

    expect(within(panel).getByText("export const priceOf = () => 1")).toBeTruthy()
  })

  it("emphasises a hovered node, the nodes connected to it and the edges between them, and a selected one more strongly", async () => {
    const { container } = renderDiagram()
    const emphasisOf = (name: RegExp) => nodeButton(name)?.getAttribute("data-emphasis")
    const edgeEmphases = () => [...container.ownerDocument.querySelectorAll("path[data-kind]")].map((path) => path.getAttribute("data-emphasis"))

    fireEvent.mouseEnter(screen.getByRole("button", { name: /Checkout endpoint/ }))

    expect([emphasisOf(/Entry point:\s*Customer clicks Checkout/), emphasisOf(/Checkout endpoint/), emphasisOf(/Price of a line/), emphasisOf(/Search results/)])
      .toStrictEqual(["hovered", "hovered", "hovered", null])
    expect(edgeEmphases()).toStrictEqual(["hovered", "hovered", "hovered", null])

    fireEvent.click(screen.getByRole("button", { name: /Price of a line/ }))
    await screen.findByRole("region", { name: "Price of a line" })

    expect([emphasisOf(/Entry point:\s*Customer clicks Checkout/), emphasisOf(/Checkout endpoint/), emphasisOf(/Price of a line/)])
      .toStrictEqual(["hovered", "selected", "selected"])
    expect(edgeEmphases()).toStrictEqual(["hovered", "selected", "hovered", null])
  })

  it("emphasises every node and edge on the path of a hovered entry point", () => {
    const { container } = renderDiagram()

    fireEvent.mouseEnter(screen.getByRole("button", { name: /Entry point:\s*Customer clicks Checkout/ }))

    expect([/Checkout endpoint/, /Price of a line/, /Search results/].map((name) => nodeButton(name)?.getAttribute("data-emphasis")))
      .toStrictEqual(["hovered", "hovered", null])
    expect([...container.querySelectorAll("path[data-kind]")].map((path) => path.getAttribute("data-emphasis"))).toStrictEqual(["hovered", "hovered", "hovered", null])
  })

  it("hides the nodes an entry point leads to when its path is hidden, keeps the entry point marked as hidden, and shows them again", () => {
    const { container } = renderDiagram()
    const nodeLabels = () => ["Customer clicks Checkout", "Customer searches", "Checkout endpoint", "Search results", "Price of a line"]
      .filter((label) => screen.queryByText(label) !== null)
    const hideCheckout = screen.getByRole("button", { name: "Hide the nodes this entry point leads to: Customer clicks Checkout" })

    expect(hideCheckout.querySelector("[data-hint]")?.textContent).toBe("Hide the nodes this entry point leads to")

    fireEvent.click(hideCheckout)
    fireEvent.click(screen.getByRole("button", { name: "Hide the nodes this entry point leads to: Customer searches" }))

    expect(nodeLabels()).toStrictEqual(["Customer clicks Checkout", "Customer searches"])
    expect(container.querySelectorAll("path[data-kind]")).toHaveLength(0)
    expect(screen.getByRole("button", { name: /Entry point:\s*Customer searches/ }).getAttribute("data-path-hidden")).toBe("true")

    fireEvent.click(screen.getByRole("button", { name: "Show the nodes this entry point leads to: Customer searches" }))

    expect(nodeLabels()).toStrictEqual(["Customer clicks Checkout", "Customer searches", "Search results"])
    expect(screen.getByRole("button", { name: /Entry point:\s*Customer searches/ }).getAttribute("data-path-hidden")).toBe("false")
  })

  it("closes the side panel on Escape and stays full screen, then leaves full screen on the next Escape", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Price of a line/ }))
    const panel = await screen.findByRole("region", { name: "Price of a line" })
    fireEvent.keyDown(panel, { key: "Escape" })

    expect(screen.queryByRole("region", { name: "Price of a line" })).toBeNull()
    expect(screen.getByRole("button", { name: "Leave full screen" })).toBeTruthy()

    fireEvent.keyDown(screen.getByRole("button", { name: "Leave full screen" }), { key: "Escape" })

    expect(await screen.findByRole("button", { name: "Full screen" })).toBeTruthy()
  })

  it("hides the entry points that do not lead to a node when the node is focused, and shows them again", () => {
    renderDiagram()
    const isPathHidden = (name: RegExp) => screen.getByRole("button", { name }).getAttribute("data-path-hidden")

    fireEvent.click(menuButton("Price of a line", "Focus"))

    expect([isPathHidden(/Entry point:\s*Customer clicks Checkout/), isPathHidden(/Entry point:\s*Customer searches/)]).toStrictEqual(["false", "true"])
    expect(screen.queryByText("Search results")).toBeNull()
    expect(screen.queryByText("Audit log")).toBeNull()
    expect(screen.getByText("Checkout endpoint")).toBeTruthy()
    expect(menuButton("Price of a line", "Focus").getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("toolbar", { name: "Price of a line" }).parentElement?.getAttribute("data-pinned")).toBe("true")

    fireEvent.click(menuButton("Price of a line", "Focus"))

    expect(isPathHidden(/Entry point:\s*Customer searches/)).toBe("false")
    expect(screen.getByText("Search results")).toBeTruthy()
    expect(screen.getByText("Audit log")).toBeTruthy()
  })

  it("collapses a node and the nodes it leads to, keeps the arrow into it with a button that expands it again", () => {
    const { container } = renderDiagram()
    const edgeKinds = () => [...container.querySelectorAll("path[data-kind]")].map((path) => path.getAttribute("data-kind"))

    fireEvent.click(menuButton("Checkout endpoint", "Collapse"))

    expect(screen.queryByText("Checkout endpoint")).toBeNull()
    expect(screen.queryByText("Price of a line")).toBeNull()
    expect(edgeKinds()).toStrictEqual(["call", "call"])

    const expand = screen.getByRole("button", { name: "Expand: Checkout endpoint" })

    expect(expand.querySelector("[data-hint]")?.textContent).toBe("Show this node and the nodes it leads to again: Checkout endpoint")

    fireEvent.click(expand)

    expect(screen.getByText("Checkout endpoint")).toBeTruthy()
    expect(screen.getByText("Price of a line")).toBeTruthy()
    expect(edgeKinds()).toStrictEqual(["call", "call", "call", "call"])
  })

  it("hides the path of every entry point on Collapse all, and shows every node again on Expand all", () => {
    renderDiagram()
    const codeNodeLabels = () => ["Checkout endpoint", "Audit log", "Search results", "Price of a line"].filter((label) => screen.queryByText(label) !== null)

    fireEvent.click(menuButton("Checkout endpoint", "Collapse"))
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }))

    expect(codeNodeLabels()).toStrictEqual([])
    expect(screen.getByRole("button", { name: /Entry point:\s*Customer searches/ }).getAttribute("data-path-hidden")).toBe("true")

    fireEvent.click(screen.getByRole("button", { name: "Expand all" }))

    expect(codeNodeLabels()).toHaveLength(4)
    expect(screen.getByRole("button", { name: /Entry point:\s*Customer searches/ }).getAttribute("data-path-hidden")).toBe("false")
  })

  it("shows no traced lines heading for a node that has none", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Checkout endpoint/ }))
    const panel = await screen.findByRole("region", { name: "Checkout endpoint" })

    expect(within(panel).queryByRole("heading", { name: "Traced lines" })).toBeNull()
  })
})

const CARD_NODES: readonly JourneyNode[] = [
  node({ id: "visit", kind: "entry-point", label: "A shopper opens /orders", category: null, kindLabel: "Entry point", sublabel: null }),
  node({ id: "click", kind: "entry-point", label: "A shopper clicks All", category: null, kindLabel: "Entry point", sublabel: null, isInsideCard: true }),
  node({ id: "page", kind: "code", label: "Orders page", category: "ui", kindLabel: "UI", isInsideCard: true, description: paragraph("Lists the orders.") }),
  node({ id: "filter", kind: "code", label: "Status filter", category: "ui", kindLabel: "UI", isInsideCard: true, change: "added", changedLabel: "Added" }),
  node({ id: "handler", kind: "code", label: "Sets the status", category: "event", kindLabel: "Event", x: 700 }),
]

const CARD_EDGES: readonly JourneyEdge[] = [
  { id: "visit>page", from: "visit", to: "page", points: [{ x: 264, y: 26 }, { x: 300, y: 60 }], isInsideCard: false },
  { id: "page>filter", from: "page", to: "filter", points: [], isInsideCard: true },
  { id: "click>handler", from: "click", to: "handler", points: [{ x: 664, y: 150 }, { x: 700, y: 150 }], isInsideCard: false },
]

const UI_CARDS: readonly UiCard[] = [
  {
    id: "ui:page",
    x: 300,
    y: 0,
    width: 364,
    height: 220,
    kindLabel: "UI",
    label: "Orders page",
    sublabel: "src/routes/orders/index.tsx",
    nodeId: null,
    hasLineOut: false,
    hasLineIn: false,
    frames: [
      { key: "ui:page", role: "component", ownerNodeId: "page", sublabel: null, nodeId: "page", x: 312, y: 44, width: 340, height: 164, depth: 0, label: "Orders page", isDraft: false, change: null, changedLabel: null, data: [{ name: "orders", changeType: "related" }], hiddenDataLabel: "+2 more", hasLineOut: false, hasLineIn: true },
      { key: "ui:page/0", role: "component", ownerNodeId: "filter", sublabel: null, nodeId: "filter", x: 322, y: 114, width: 320, height: 84, depth: 1, label: "Status filter", isDraft: false, change: "added", changedLabel: "Added", data: [], hiddenDataLabel: null, hasLineOut: false, hasLineIn: false },
    ],
    triggers: [
      { key: "ui:page/0/click/0", entryPointId: "click", eventNodeId: "handler", x: 332, y: 128, width: 300, height: 44, label: "A shopper clicks All", sublabel: "Button.onClick :12" },
    ],
  },
]

const renderCards = () =>
  render(
    <JourneyFlowDiagram title="Orders" width={1000} height={260} nodes={CARD_NODES} uiCards={UI_CARDS} edges={CARD_EDGES} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />,
  )

describe("JourneyFlowDiagram with a UI card", () => {
  it("draws the components of a page as frames of one card, with their data", () => {
    renderCards()

    const page = screen.getByRole("button", { name: /Orders page/ })
    const filter = screen.getByRole("button", { name: /Status filter/ })

    expect(within(page).getByText("orders")).toBeTruthy()
    expect(within(page).getByText("+2 more")).toBeTruthy()
    expect(within(filter).getByText("Added")).toBeTruthy()
    expect(screen.getByText("src/routes/orders/index.tsx")).toBeTruthy()
  })

  it("draws a user action as a row of its component, with the event that catches it under it, and no sign of its own", () => {
    renderCards()

    const trigger = screen.getByRole("button", { name: /^A shopper clicks All/ })

    expect(within(trigger).getByText("Button.onClick :12")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Entry point:\s*A shopper clicks All/ })).toBeNull()
    expect(screen.getByRole("button", { name: /Entry point:\s*A shopper opens \/orders/ })).toBeTruthy()
  })

  it("opens the panel of a component when its frame is chosen", () => {
    renderCards()

    fireEvent.click(screen.getByRole("button", { name: /Orders page/ }))

    expect(screen.getByText("Lists the orders.")).toBeTruthy()
  })
})

const frame = (overrides: Partial<UiCard["frames"][number]> & Pick<UiCard["frames"][number], "key" | "role" | "nodeId" | "ownerNodeId" | "label">): UiCard["frames"][number] => ({
  x: 312,
  y: 44,
  width: 340,
  height: 32,
  depth: 0,
  sublabel: null,
  isDraft: false,
  change: null,
  changedLabel: null,
  data: [],
  hiddenDataLabel: null,
  hasLineOut: false,
  hasLineIn: false,
  ...overrides,
})

const RETURN_NODES: readonly JourneyNode[] = [
  node({ id: "visit", kind: "entry-point", label: "A shopper opens /orders", category: null, kindLabel: "Entry point", sublabel: null }),
  node({ id: "page", kind: "code", label: "Shows a shopper's orders", category: "ui", kindLabel: "UI", isInsideCard: true, description: paragraph("The orders page.") }),
  node({ id: "page#return@9", kind: "return", label: "if (isPending) return", isDraft: true, category: "ui", kindLabel: "UI", isInsideCard: true }),
  node({ id: "page#return@11", kind: "return", label: "Renders the orders", category: "ui", kindLabel: "UI", isInsideCard: true, description: paragraph("One row per order.") }),
  node({ id: "row", kind: "code", label: "Order row", category: "ui", kindLabel: "UI", isInsideCard: true, description: paragraph("One order.") }),
  node({ id: "row#return@8", kind: "return", label: "Renders a cancelled order", category: "ui", kindLabel: "UI", isInsideCard: true }),
  node({ id: "price", kind: "code", label: "Formats a price", x: 700, y: 300 }),
]

const RETURN_CARDS: readonly UiCard[] = [
  {
    id: "ui:page",
    x: 300,
    y: 0,
    width: 364,
    height: 260,
    kindLabel: "UI",
    label: "OrdersPage",
    sublabel: "src/routes/orders/index.tsx",
    nodeId: "page",
    hasLineOut: false,
    hasLineIn: true,
    frames: [
      frame({ key: "ui:page/0", role: "return", nodeId: "page#return@9", ownerNodeId: "page", label: "if (isPending) return", isDraft: true }),
      frame({ key: "ui:page/1", role: "return", nodeId: "page#return@11", ownerNodeId: "page", label: "Renders the orders", y: 84, height: 164, change: "added", changedLabel: "Added" }),
      frame({ key: "ui:page/1/0", role: "group", nodeId: "row", ownerNodeId: "row", label: "OrderRow", sublabel: "src/components/order-row.tsx", y: 124, height: 114, depth: 1 }),
      frame({ key: "ui:page/1/0/0", role: "return", nodeId: "row#return@8", ownerNodeId: "row", label: "Renders a cancelled order", y: 164, depth: 2 }),
    ],
    triggers: [],
  },
]

const RETURN_EDGES: readonly JourneyEdge[] = [
  { id: "visit>page", from: "visit", to: "page", points: [{ x: 264, y: 16 }, { x: 300, y: 16 }], isInsideCard: false },
  { id: "page>row", from: "page", to: "row", points: [], isInsideCard: true },
  { id: "row>price", from: "row", to: "price", points: [{ x: 664, y: 140 }, { x: 700, y: 346 }], isInsideCard: false },
]

const renderReturns = () =>
  render(
    <JourneyFlowDiagram title="Orders" width={1000} height={420} nodes={RETURN_NODES} uiCards={RETURN_CARDS} edges={RETURN_EDGES} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />,
  )

describe("JourneyFlowDiagram with a component that has several returns", () => {
  it("draws each return as a frame of its own, with its label and its change", () => {
    renderReturns()

    const pending = screen.getByRole("button", { name: /if \(isPending\) return/ })
    const listed = screen.getByRole("button", { name: /Renders the orders/ })

    expect(pending.dataset.role).toBe("return")
    expect(within(listed).getByText("Added")).toBeTruthy()
  })

  it("opens the panel of a return when its frame is chosen", () => {
    renderReturns()

    fireEvent.click(screen.getByRole("button", { name: /Renders the orders/ }))

    expect(screen.getByText("One row per order.")).toBeTruthy()
  })

  it("opens the panel of the top-most component from the header of the card", () => {
    renderReturns()

    fireEvent.click(screen.getByRole("button", { name: /OrdersPage/ }))

    expect(screen.getByText("The orders page.")).toBeTruthy()
  })

  it("heads a nested component that has several returns with its name and its file, and opens its panel from there", () => {
    renderReturns()

    const row = screen.getByRole("button", { name: /OrderRow/ })

    expect(row.dataset.role).toBe("group")
    expect(within(row).getByText("src/components/order-row.tsx")).toBeTruthy()

    fireEvent.click(row)

    expect(screen.getByText("One order.")).toBeTruthy()
  })

  it("hides the returns of a component with the component when the path that leads to it is hidden", () => {
    renderReturns()

    fireEvent.click(screen.getByRole("button", { name: /^Hide the nodes this entry point leads to/ }))

    expect(screen.queryByRole("button", { name: /Renders the orders/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Renders a cancelled order/ })).toBeNull()
  })
})
