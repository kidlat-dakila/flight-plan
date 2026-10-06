import { fireEvent, render, screen } from "@testing-library/react"
import Prose from "@/components/Prose"
import { CODE_LINKS } from "@/lib/__tests__/review-samples"
import type { ProseBlocks } from "@/lib/review-content"

const BLOCKS: ProseBlocks = [
  { kind: "heading", inlines: [{ kind: "text", text: "Overview" }] },
  {
    kind: "paragraph",
    inlines: [
      { kind: "text", text: "Reads " },
      { kind: "code", text: "held" },
      { kind: "strong", text: " first" },
      { kind: "code-link", text: "priceOf()", isCode: true, linkId: "src/price.ts#priceOf" },
      { kind: "code-link", text: "gone()", isCode: true, linkId: null },
    ],
  },
  { kind: "list", isOrdered: true, items: [[{ kind: "text", text: "First step" }], [{ kind: "text", text: "Second step" }]] },
]

describe("Prose", () => {
  it("renders headings, paragraphs, inline code, bold text and lists", () => {
    render(<Prose blocks={BLOCKS} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />)

    expect(screen.getByRole("heading", { level: 3, name: "Overview" })).toBeTruthy()
    expect(screen.getByText("held").tagName).toBe("CODE")
    expect(screen.getByText("first").tagName).toBe("STRONG")
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toStrictEqual(["First step", "Second step"])
  })

  it("links a code link it has a target for, and reports its anchor when opened", () => {
    const onOpenCodeLink = vi.fn()
    render(<Prose blocks={BLOCKS} codeLinks={CODE_LINKS} onOpenCodeLink={onOpenCodeLink} />)

    const link = screen.getByRole("link", { name: "priceOf()" })

    expect(link.getAttribute("href")).toBe("#waypoint-price-of")

    fireEvent.click(link)

    expect(onOpenCodeLink).toHaveBeenCalledWith("waypoint-price-of")
  })

  it("leaves a code link without a target as plain code", () => {
    render(<Prose blocks={BLOCKS} codeLinks={CODE_LINKS} onOpenCodeLink={vi.fn()} />)

    expect(screen.queryByRole("link", { name: "gone()" })).toBeNull()
    expect(screen.getByText("gone()").tagName).toBe("CODE")
  })
})
