import { fireEvent, render, screen, within } from "@testing-library/react"
import BlastDiagram, { type BlastBoard, type BlastNode } from "@/components/BlastDiagram"
import { paragraph } from "@/lib/__tests__/review-samples"

const node = (overrides: Partial<BlastNode> & Pick<BlastNode, "id" | "label" | "verdict" | "verdictLabel">): BlastNode => ({
  x: 32,
  y: 88,
  width: 240,
  height: 64,
  isDraft: false,
  shieldLabel: null,
  contract: null,
  effect: null,
  codeLinkId: null,
  ...overrides,
})

const BOARD: BlastBoard = {
  width: 700,
  height: 300,
  zones: [{ label: "Epicenter", x: 24, width: 256 }, { label: "Direct impact", x: 376, width: 256 }],
  files: [{ id: "0:src/price.ts", label: "src/price.ts", x: 24, y: 60, width: 256, height: 100 }],
  nodes: [
    node({
      id: "price",
      label: "priceOf",
      verdict: "changed",
      verdictLabel: "Changed",
      contract: { beforeLabel: "Before", before: null, absentLabel: "Did not exist before this change.", nowLabel: "Now", now: paragraph("Takes held.") },
    }),
    node({ id: "table", label: "RestockTable", verdict: "unassessed", verdictLabel: "Not assessed", shieldLabel: "Shielded by lowStockSkus", x: 384 }),
  ],
  edges: [{ id: "e", kind: "call", isAssumed: false, route: "across", points: [{ x: 272, y: 120 }, { x: 384, y: 120 }] }],
}

describe("BlastDiagram", () => {
  it("draws the zones, the files and each node with its verdict", () => {
    render(<BlastDiagram title="Blast Diagram" board={BOARD} codeLinks={{}} onOpenCodeLink={vi.fn()} />)

    const board = screen.getByRole("group", { name: "Blast Diagram" })

    expect(within(board).getByText("Epicenter")).toBeTruthy()
    expect(within(board).getByText("Direct impact")).toBeTruthy()
    expect(within(board).getByText("src/price.ts")).toBeTruthy()
    expect(within(board).getByRole("button", { name: /priceOf.*Changed/ }).getAttribute("data-verdict")).toBe("changed")
    expect(within(board).getByRole("button", { name: /RestockTable.*Not assessed.*Shielded by lowStockSkus/ })).toBeTruthy()
  })

  it("shows a node's contract in the side panel when the node is pressed", async () => {
    render(<BlastDiagram title="Blast Diagram" board={BOARD} codeLinks={{}} onOpenCodeLink={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: /priceOf/ }))

    const panel = await screen.findByRole("region", { name: "priceOf" })

    expect(within(panel).getByText("Did not exist before this change.")).toBeTruthy()
    expect(within(panel).getByText("Takes held.")).toBeTruthy()
  })
})
