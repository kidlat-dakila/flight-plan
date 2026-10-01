import { acrossPath, smoothPath, withinPath } from "@/lib/diagram-path"

describe("diagram paths", () => {
  it("joins two points with a straight line", () => {
    expect(smoothPath([{ x: 0, y: 0 }, { x: 0, y: 40 }])).toBe("M 0 0 L 0 40")
  })

  it("rounds the corners of a longer route and ends on its last point", () => {
    expect(smoothPath([{ x: 0, y: 0 }, { x: 0, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 60 }])).toBe(
      "M 0 0 Q 0 20 20 20 Q 40 20 40 60",
    )
  })

  it("bends a route across rings through the middle between them", () => {
    expect(acrossPath([{ x: 100, y: 10 }, { x: 200, y: 90 }])).toBe("M 100 10 C 150 10 150 90 200 90")
  })

  it("bulges a route inside a ring out past its nodes", () => {
    expect(withinPath([{ x: 100, y: 10 }, { x: 100, y: 90 }])).toBe("M 100 10 C 144 10 144 90 100 90")
  })
})
