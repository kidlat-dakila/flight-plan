import { render } from "@testing-library/react"
import VerdictMark, { type Verdict } from "@/components/VerdictMark"

const VERDICTS: readonly Verdict[] = ["changed", "breaks", "behaviour-changes", "unaffected", "unassessed"]

const drawingOf = (verdict: Verdict): string =>
  [...render(<VerdictMark verdict={verdict} />).container.querySelectorAll("circle, path")]
    .map((shape) => `${shape.tagName}:${shape.getAttribute("class") ?? ""}`)
    .join("|")

describe("VerdictMark", () => {
  it("draws a different decorative mark for each verdict", () => {
    const { container } = render(<VerdictMark verdict="breaks" />)

    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
    expect(new Set(VERDICTS.map(drawingOf)).size).toBe(VERDICTS.length)
  })
})
