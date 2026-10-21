import { mostPresentIndexOf, visibleViewIdsOf, type ScreenBox } from "@/lib/guide-tooltips/layout"

const VIEWPORT: ScreenBox = { top: 0, bottom: 800, left: 0, right: 1200 }

const boxOf = (top: number, bottom: number): ScreenBox => ({ top, bottom, left: 100, right: 300 })

describe("guide tooltip layout", () => {
  it("picks the element most in view, the first of equals", () => {
    expect(mostPresentIndexOf([boxOf(-150, 50), boxOf(100, 200), boxOf(300, 400)], VIEWPORT)).toBe(1)
  })

  it("picks nothing when no element is on screen", () => {
    expect(mostPresentIndexOf([boxOf(900, 1000), boxOf(0, 0)], VIEWPORT)).toBeNull()
  })

  it("counts the section in view, the views on screen inside it and the free ones on screen", () => {
    expect(visibleViewIdsOf([
      { viewId: "context-section", placement: "dominant", isOnScreen: true },
      { viewId: "change-overview-section", placement: "inside-dominant", isOnScreen: true },
      { viewId: "waypoint-card-section", placement: "free", isOnScreen: true },
      { viewId: "waypoint-box-section", placement: "inside-dominant", isOnScreen: false },
      { viewId: "code-walkthrough-section", placement: "elsewhere", isOnScreen: true },
    ])).toStrictEqual(["context-section", "change-overview-section", "waypoint-card-section"])
  })
})
