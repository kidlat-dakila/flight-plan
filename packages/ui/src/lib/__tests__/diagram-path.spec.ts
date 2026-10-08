import { acrossPath, straightPath, withinPath } from "@/lib/diagram-path"

describe("diagram paths", () => {
  it("joins two points with a straight line", () => {
    expect(straightPath([{ x: 0, y: 0 }, { x: 0, y: 40 }])).toBe("M 0 0 L 0 40")
  })

  it("keeps every corner of a longer route sharp and ends on its last point", () => {
    expect(straightPath([{ x: 0, y: 0 }, { x: 0, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 60 }])).toBe("M 0 0 L 0 20 L 40 20 L 40 60")
  })

  it("bends a route across rings through the middle between them", () => {
    expect(acrossPath([{ x: 100, y: 10 }, { x: 200, y: 90 }])).toBe("M 100 10 C 150 10 150 90 200 90")
  })

  it("bulges a route inside a ring out past its nodes", () => {
    expect(withinPath([{ x: 100, y: 10 }, { x: 100, y: 90 }])).toBe("M 100 10 C 144 10 144 90 100 90")
  })
})
