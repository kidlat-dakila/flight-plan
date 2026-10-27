import { fireEvent, render, screen, within } from "@testing-library/react"
import SectionRail, { type RailGroup } from "@/components/SectionRail"

const GROUPS: readonly RailGroup[] = [
  {
    anchorId: "segment-stock",
    label: "Stock check",
    detailLabel: "5 files",
    sections: [
      { anchorId: "stock-context", label: "Context", children: [] },
      { anchorId: "stock-trace", label: "Trace Diagram", children: [{ anchorId: "stock-trace-a", label: "A checkout" }] },
    ],
  },
  { anchorId: "segment-checkout", label: "Checkout", detailLabel: "3 files", sections: [{ anchorId: "checkout-context", label: "Context", children: [] }] },
]

const TRAILING = [{ anchorId: "conversation", label: "Conversation", children: [] }]

describe("SectionRail", () => {
  it("lists each segment with its sections nested under it, then the sections of the whole artifact", () => {
    render(<SectionRail label="Review sections" groups={GROUPS} sections={TRAILING} currentAnchorId={null} />)

    const rail = screen.getByRole("navigation", { name: "Review sections" })

    expect(within(rail).getAllByRole("link").map((link) => link.getAttribute("href"))).toStrictEqual([
      "#segment-stock",
      "#stock-context",
      "#stock-trace",
      "#stock-trace-a",
      "#segment-checkout",
      "#checkout-context",
      "#conversation",
    ])
    expect(within(rail).getByRole("link", { name: /Stock check.*5 files/ })).toBeTruthy()
  })

  it("marks the section the reader is in", () => {
    render(<SectionRail label="Review sections" groups={GROUPS} sections={TRAILING} currentAnchorId="stock-trace-a" />)

    expect(screen.getByRole("link", { name: "A checkout" }).getAttribute("aria-current")).toBe("location")
    expect(screen.getByRole("link", { name: "Trace Diagram" }).getAttribute("aria-current")).toBeNull()
  })

  it("has no segment heading for a change that is not segmented", () => {
    render(
      <SectionRail
        label="Review sections"
        groups={[{ anchorId: "segment-all", label: null, detailLabel: null, sections: GROUPS[0].sections }]}
        sections={TRAILING}
        currentAnchorId={null}
      />,
    )

    expect(screen.queryByRole("link", { name: /files/ })).toBeNull()
    expect(screen.getByRole("link", { name: "Context" })).toBeTruthy()
  })

  it("hands a clicked section, file or segment to the jump instead of following its link", () => {
    const onJump = vi.fn()
    render(<SectionRail label="Review sections" groups={GROUPS} sections={TRAILING} currentAnchorId={null} onJump={onJump} />)

    const isFollowed = [
      fireEvent.click(screen.getByRole("link", { name: "Trace Diagram" })),
      fireEvent.click(screen.getByRole("link", { name: "A checkout" })),
      fireEvent.click(screen.getByRole("link", { name: /Checkout.*3 files/ })),
    ]

    expect(isFollowed).toStrictEqual([false, false, false])
    expect(onJump.mock.calls).toStrictEqual([["stock-trace"], ["stock-trace-a"], ["segment-checkout"]])
  })
})
