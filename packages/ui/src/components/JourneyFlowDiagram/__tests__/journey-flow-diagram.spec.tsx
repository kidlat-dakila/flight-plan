import { fireEvent, render, screen, within } from "@testing-library/react"
import JourneyFlowDiagram, { type JourneyEdge, type JourneyNode } from "@/components/JourneyFlowDiagram"
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
  callStackHeading: null,
  callStacks: [],
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
    callStackHeading: "Call stack",
    callStacks: [
      {
        label: "Checkout endpoint",
        frames: [
          {
            label: "Checkout endpoint",
            pathLabel: "src/routes/checkout.ts",
            changedLabel: null,
            lines: [{ numberLabel: "12", mark: "context", isFocused: false, tokens: [{ text: "  const price = priceOf(line)", kind: "plain" }] }],
          },
          {
            label: "Price of a line",
            pathLabel: "src/price.ts",
            changedLabel: "Modified",
            lines: [
              { numberLabel: "4", mark: "context", isFocused: false, tokens: [{ text: "  if", kind: "keyword" }, { text: " (line.held > 0) {", kind: "plain" }] },
              { numberLabel: "5", mark: "added", isFocused: false, tokens: [{ text: "    return line.price - line.held", kind: "plain" }] },
            ],
          },
        ],
      },
      {
        label: "Cart total",
        frames: [
          {
            label: "Cart total",
            pathLabel: "src/cart.ts",
            changedLabel: null,
            lines: [{ numberLabel: "8", mark: "context", isFocused: false, tokens: [{ text: "  return lines.map(priceOf)", kind: "plain" }] }],
          },
          { label: "Price of a line", pathLabel: "src/price.ts", changedLabel: "Modified", lines: [] },
        ],
      },
    ],
    description: paragraph("Subtracts the held units."),
    codeLinkId: "src/price.ts#priceOf",
  }),
]

const EDGES: readonly JourneyEdge[] = [
  { id: "a", from: "click", to: "route", kind: "trigger", isAssumed: false, points: [{ x: 10, y: 10 }, { x: 10, y: 120 }], label: null },
  { id: "b", from: "route", to: "price", kind: "value", isAssumed: true, points: [{ x: 10, y: 212 }, { x: 10, y: 260 }], label: { text: "value, assumed", x: 10, y: 236 } },
  { id: "d", from: "route", to: "audit", kind: "call", isAssumed: false, points: [{ x: 264, y: 160 }, { x: 600, y: 160 }], label: null },
  { id: "c", from: "search", to: "results", kind: "trigger", isAssumed: false, points: [{ x: 310, y: 52 }, { x: 310, y: 120 }], label: null },
]

const renderDiagram = () =>
  render(
    <JourneyFlowDiagram title="A checkout" width={320} height={380} nodes={NODES} edges={EDGES} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />,
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

  it("draws one edge per connection, by kind, and labels the ones that need a word", () => {
    const { container } = renderDiagram()

    expect([...container.querySelectorAll("path[data-kind]")].map((path) => path.getAttribute("data-kind"))).toStrictEqual(["trigger", "value", "call", "trigger"])
    expect(screen.getByText("value, assumed")).toBeTruthy()
  })

  it("opens full screen with the node's description when a node is pressed", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Price of a line/ }))

    const panel = await screen.findByRole("region", { name: "Price of a line" })

    expect(within(panel).getByText("Subtracts the held units.")).toBeTruthy()

    fireEvent.click(within(panel).getByRole("button", { name: "Close the code panel" }))

    expect(screen.queryByRole("region", { name: "Price of a line" })).toBeNull()
  })

  it("lists one call stack per node that points to the pressed node, each with the frame of that node and then its own", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Price of a line/ }))

    const callStack = await screen.findByRole("region", { name: "Call stack" })
    const frameLabels = (stackLabel: string) =>
      within(within(callStack).getByRole("region", { name: stackLabel })).getAllByRole("listitem").map((frame) => within(frame).getByRole("heading").textContent)

    expect(frameLabels("Checkout endpoint")).toStrictEqual(["Checkout endpoint", "Price of a line"])
    expect(frameLabels("Cart total")).toStrictEqual(["Cart total", "Price of a line"])
  })

  it("heads each frame the way a file of the walkthrough is headed: its label over its path, and how it changed", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Price of a line/ }))

    const stack = within(await screen.findByRole("region", { name: "Call stack" })).getByRole("region", { name: "Checkout endpoint" })
    const [parentFrame, ownFrame] = within(stack).getAllByRole("listitem")

    expect(within(parentFrame).getByText("src/routes/checkout.ts")).toBeTruthy()
    expect(within(parentFrame).queryByText("Modified")).toBeNull()
    expect(within(ownFrame).getByText("src/price.ts")).toBeTruthy()
    expect(within(ownFrame).getByText("Modified")).toBeTruthy()
  })

  it("shows every frame collapsed, with an accordion on its header that opens and closes its lines", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Price of a line/ }))

    const stack = within(await screen.findByRole("region", { name: "Call stack" })).getByRole("region", { name: "Checkout endpoint" })
    const headers = within(stack).getAllByRole("button")

    expect(headers.map((header) => header.getAttribute("aria-expanded"))).toStrictEqual(["false", "false"])
    expect(within(stack).queryByText(/priceOf\(line\)/)).toBeNull()

    fireEvent.click(headers[0])

    expect(headers.map((header) => header.getAttribute("aria-expanded"))).toStrictEqual(["true", "false"])
    expect(within(stack).getByText(/priceOf\(line\)/)).toBeTruthy()

    fireEvent.click(headers[0])

    expect(within(stack).queryByText(/priceOf\(line\)/)).toBeNull()
  })

  it("opens a frame in one call stack without opening the same node's frame in another", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Price of a line/ }))

    const callStack = await screen.findByRole("region", { name: "Call stack" })
    const ownFrameIn = (stackLabel: string) => within(within(callStack).getByRole("region", { name: stackLabel })).getByRole("button", { name: /Price of a line/ })
    fireEvent.click(ownFrameIn("Checkout endpoint"))

    expect([ownFrameIn("Checkout endpoint"), ownFrameIn("Cart total")].map((header) => header.getAttribute("aria-expanded"))).toStrictEqual(["true", "false"])
  })

  it("draws the lines of a frame as code, with their numbers, their tokens and the changed line marked", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Price of a line/ }))

    const callStack = await screen.findByRole("region", { name: "Call stack" })
    const checkoutStack = within(callStack).getByRole("region", { name: "Checkout endpoint" })
    fireEvent.click(within(checkoutStack).getByRole("button", { name: /Price of a line/ }))
    const code = within(callStack).getByRole("group", { name: "Price of a line, src/price.ts" })
    const rows = [...code.querySelectorAll("[data-line]")]

    expect(rows.map((row) => [row.getAttribute("data-line"), row.getAttribute("data-mark")])).toStrictEqual([["4", "context"], ["5", "added"]])
    expect(within(code).getByText("if").className).toContain("text-syntax-keyword")
    expect(within(code).getByText(/return line\.price - line\.held/)).toBeTruthy()
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
    expect(edgeKinds()).toStrictEqual(["trigger", "trigger"])

    const expand = screen.getByRole("button", { name: "Expand: Checkout endpoint" })

    expect(expand.querySelector("[data-hint]")?.textContent).toBe("Show this node and the nodes it leads to again: Checkout endpoint")

    fireEvent.click(expand)

    expect(screen.getByText("Checkout endpoint")).toBeTruthy()
    expect(screen.getByText("Price of a line")).toBeTruthy()
    expect(edgeKinds()).toStrictEqual(["trigger", "value", "call", "trigger"])
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

  it("shows no call stack for a node that has none", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Checkout endpoint/ }))
    await screen.findByRole("region", { name: "Checkout endpoint" })

    expect(screen.queryByRole("region", { name: "Call stack" })).toBeNull()
  })
})
