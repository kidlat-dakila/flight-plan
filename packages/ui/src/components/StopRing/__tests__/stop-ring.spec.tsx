import { render } from "@testing-library/react"
import StopRing, { type StopStatus } from "@/components/StopRing"

const STATUSES: readonly StopStatus[] = [
  "no-review",
  "awaiting-review",
  "awaiting-reply",
  "stale",
  "draft",
  "closed",
  "merged",
]

const drawingOf = (status: StopStatus): string =>
  [...render(<StopRing status={status} />).container.querySelectorAll("circle, path, rect")]
    .map((shape) => shape.getAttribute("class") ?? "")
    .join("|")

describe("StopRing", () => {
  it("draws a decorative ring that carries its status", () => {
    const { container } = render(<StopRing status="stale" />)

    const ring = container.querySelector("svg")

    expect(ring?.getAttribute("data-status")).toBe("stale")
    expect(ring?.getAttribute("aria-hidden")).toBe("true")
  })

  it("draws a different ring for each status", () => {
    const drawings = new Set(STATUSES.map(drawingOf))

    expect(drawings.size).toBe(STATUSES.length)
  })
})
