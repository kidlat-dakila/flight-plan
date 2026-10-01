import { fireEvent, render, screen, within } from "@testing-library/react"
import JourneyFlowDiagram, { type JourneyEdge, type JourneyNode } from "@/components/JourneyFlowDiagram"
import { CODE_LINKS, paragraph } from "@/lib/__tests__/review-samples"

const node = (overrides: Partial<JourneyNode> & Pick<JourneyNode, "id" | "kind" | "label">): JourneyNode => ({
  x: 0,
  y: 0,
  width: 264,
  height: 92,
  category: "logic",
  kindLabel: "Logic",
  changedLabel: null,
  isDraft: false,
  sublabel: "src/price.ts",
  description: null,
  codeLinkId: null,
  ...overrides,
})

const NODES: readonly JourneyNode[] = [
  node({ id: "click", kind: "entry-point", label: "Customer clicks Checkout", category: null, kindLabel: "Entry point", sublabel: null }),
  node({ id: "route", kind: "tail", label: "Checkout endpoint", y: 120 }),
  node({
    id: "price",
    kind: "head",
    label: "Price of a line",
    y: 260,
    changedLabel: "Changed",
    description: paragraph("Subtracts the held units."),
    codeLinkId: "src/price.ts#priceOf",
  }),
]

const EDGES: readonly JourneyEdge[] = [
  { id: "a", kind: "trigger", isAssumed: false, points: [{ x: 10, y: 10 }, { x: 10, y: 120 }], label: null },
  { id: "b", kind: "value", isAssumed: true, points: [{ x: 10, y: 212 }, { x: 10, y: 260 }], label: { text: "value, assumed", x: 10, y: 236 } },
]

const renderDiagram = () =>
  render(
    <JourneyFlowDiagram title="A checkout" width={320} height={380} nodes={NODES} edges={EDGES} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />,
  )

describe("JourneyFlowDiagram", () => {
  it("draws every node with its kind, and marks the changed one", () => {
    renderDiagram()

    const board = screen.getByRole("group", { name: "A checkout" })

    expect(within(board).getByRole("button", { name: /Entry point:\s*Customer clicks Checkout/ })).toBeTruthy()
    expect(within(board).getByRole("button", { name: /Checkout endpoint/ }).getAttribute("data-kind")).toBe("tail")
    expect(within(board).getByRole("button", { name: /Changed.*Price of a line/ }).getAttribute("data-kind")).toBe("head")
  })

  it("draws one edge per connection, by kind, and labels the ones that need a word", () => {
    const { container } = renderDiagram()

    expect([...container.querySelectorAll("path[data-kind]")].map((path) => path.getAttribute("data-kind"))).toStrictEqual(["trigger", "value"])
    expect(screen.getByText("value, assumed")).toBeTruthy()
  })

  it("opens full screen with the node's description and code when a node is pressed", async () => {
    renderDiagram()

    fireEvent.click(screen.getByRole("button", { name: /Price of a line/ }))

    const panel = await screen.findByRole("region", { name: "Price of a line" })

    expect(within(panel).getByText("Subtracts the held units.")).toBeTruthy()
    expect(within(panel).getByText("export const priceOf = () => 1")).toBeTruthy()

    fireEvent.click(within(panel).getByRole("button", { name: "Close the code panel" }))

    expect(screen.queryByRole("region", { name: "Price of a line" })).toBeNull()
  })
})
