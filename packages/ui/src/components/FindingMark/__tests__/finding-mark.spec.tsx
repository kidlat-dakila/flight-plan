import { render, screen } from "@testing-library/react"
import FindingMark, { FindingChip, type FindingMarkKind } from "@/components/FindingMark"

const KINDS: readonly FindingMarkKind[] = ["bug", "risk", "nit", "question", "attention"]

const drawingOf = (kind: FindingMarkKind): string =>
  [...render(<FindingMark kind={kind} />).container.querySelectorAll("path, circle")]
    .map((shape) => `${shape.tagName}:${shape.getAttribute("d") ?? shape.getAttribute("r") ?? ""}:${shape.getAttribute("class") ?? ""}`)
    .join("|")

describe("FindingMark", () => {
  it("draws a different mark for each kind", () => {
    expect(new Set(KINDS.map(drawingOf)).size).toBe(KINDS.length)
  })

  it("is decorative, and the chip beside it carries the label", () => {
    const { container } = render(<FindingChip kind="bug" label="Bug" />)

    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
    expect(screen.getByText("Bug")).toBeTruthy()
  })
})
