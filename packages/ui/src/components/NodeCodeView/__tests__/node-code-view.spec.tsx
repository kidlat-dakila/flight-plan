import { fireEvent, render, screen } from "@testing-library/react"
import type { ComponentProps } from "react"
import NodeCodeView, { type CodeView } from "@/components/NodeCodeView"
import { codeLine } from "@/lib/__tests__/review-samples"

type NodeCodeViewProps = ComponentProps<typeof NodeCodeView>

const VIEW: CodeView = {
  id: "price:src/price.ts",
  heading: "Code",
  countLabel: null,
  pathLabel: "src/price.ts",
  rangeLabel: "Lines 3 to 6",
  rows: [
    {
      kind: "waypoint",
      id: "waypoint-w1",
      waypoint: {
        id: "w1",
        previousId: null,
        nextId: null,
        anchorId: "waypoint-w1",
        depth: 0,
        title: "priceOf",
        isDraft: false,
        positionLabel: "1 of 1",
        rangeLabel: "Lines 3–4",
        mark: { kind: "plain", label: "Waypoint 1 of 1: priceOf" },
        lines: { lineStart: 3, lineEnd: 4 },
        chip: null,
        attentionLabel: null,
        reading: null,
        unwrittenLabel: "Not written yet.",
        needsAttention: null,
        findings: [],
        isReviewed: false,
        reviewLabel: "Reviewed",
      },
      rootBlockId: null,
    },
    { kind: "lines", id: "lines-3", lines: [codeLine("3", "export const priceOf = () => 1", "added"), codeLine("4", "// held units", "added")], collapses: [] },
    { kind: "gap", id: "gap-1", label: "1 line hidden", rootBlockId: null },
    { kind: "lines", id: "lines-6", lines: [codeLine("6", "export const totalOf = () => 2")], collapses: [] },
  ],
  note: null,
  forgeLink: null,
}

const createProps = (overrides: Partial<NodeCodeViewProps> = {}): NodeCodeViewProps => ({
  view: VIEW,
  isReviewPending: false,
  codeLinks: {},
  codeDefinitions: {},
  onOpenCodeLink: vi.fn(),
  onWaypointReviewedChange: vi.fn(),
  ...overrides,
})

const WAYPOINT_MARK_NAME = "Waypoint 1 of 1: priceOf"

describe("NodeCodeView", () => {
  it("draws a closed waypoint as a mark beside its first line, as the Code Walkthrough does, under an anchor of its own view", () => {
    render(<NodeCodeView {...createProps()} />)
    const mark = screen.getByRole("button", { name: WAYPOINT_MARK_NAME, expanded: false })

    expect(screen.queryByRole("region", { name: "priceOf" })).toBeNull()
    expect(mark.closest("[data-line]")).toBe(screen.getByText("export const priceOf = () => 1").closest("[data-line]"))
    expect(mark.id).toBe("price:src/price.ts-waypoint-w1")
    expect(screen.getByText("1 line hidden")).toBeTruthy()
  })

  it("opens the waypoint's box above its lines from the mark, and closes it again", () => {
    render(<NodeCodeView {...createProps()} />)

    fireEvent.click(screen.getByRole("button", { name: WAYPOINT_MARK_NAME, expanded: false }))

    expect(screen.getByRole("region", { name: "priceOf" }).id).toBe("price:src/price.ts-waypoint-w1")
    expect(screen.getByRole("button", { name: WAYPOINT_MARK_NAME, expanded: true })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: WAYPOINT_MARK_NAME, expanded: true }))

    expect(screen.queryByRole("region", { name: "priceOf" })).toBeNull()
  })

  it("has no way to comment on a line", () => {
    render(<NodeCodeView {...createProps()} />)

    expect(screen.queryByRole("button", { name: /Add a comment/ })).toBeNull()
  })
})
