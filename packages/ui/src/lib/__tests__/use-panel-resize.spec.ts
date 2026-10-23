import { EXPLORER_RESIZING, SIDE_PANEL_RESIZINGS } from "@/lib/review-panels"
import { draggedWidthOf, fittedPanelWidth } from "@/lib/use-panel-resize"

describe("draggedWidthOf", () => {
  it("widens a panel docked at the left as the pointer moves right, and one docked at the right as it moves left", () => {
    expect(draggedWidthOf(300, 300, 360, "rightwards")).toBe(360)
    expect(draggedWidthOf(224, 1300, 1240, "leftwards")).toBe(284)
  })
})

describe("fittedPanelWidth", () => {
  it("keeps each docked panel between its narrowest width and its share of the window", () => {
    expect(fittedPanelWidth(100, 1600, EXPLORER_RESIZING)).toBe(224)
    expect(fittedPanelWidth(2000, 1600, EXPLORER_RESIZING)).toBe(720)
    expect(fittedPanelWidth(2000, 1600, SIDE_PANEL_RESIZINGS.chat)).toBe(800)
    expect(fittedPanelWidth(500, 1600, SIDE_PANEL_RESIZINGS.sections)).toBe(500)
  })
})
