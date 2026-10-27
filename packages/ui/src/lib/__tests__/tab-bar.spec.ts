import { fittingTabIndexesOf, tabIndexAfterKey, visibleTabIndexesOf } from "@/lib/tab-bar"

const GAP = 4
const MORE_BUTTON_WIDTH = 70
const TAB_WIDTHS = [100, 100, 100, 100, 100, 100]

describe("tabIndexAfterKey", () => {
  it("steps right and left, wrapping around the ends", () => {
    expect(tabIndexAfterKey("ArrowRight", 1, 3)).toBe(2)
    expect(tabIndexAfterKey("ArrowRight", 2, 3)).toBe(0)
    expect(tabIndexAfterKey("ArrowLeft", 0, 3)).toBe(2)
  })

  it("jumps to the first tab with Home and the last with End, and ignores other keys", () => {
    expect(tabIndexAfterKey("Home", 2, 3)).toBe(0)
    expect(tabIndexAfterKey("End", 0, 3)).toBe(2)
    expect(tabIndexAfterKey("Enter", 0, 3)).toBeNull()
  })
})

describe("fittingTabIndexesOf", () => {
  it("keeps the tabs from the start that fit, gaps included", () => {
    expect(fittingTabIndexesOf(TAB_WIDTHS, GAP, 308, 0)).toStrictEqual([0, 1, 2])
    expect(fittingTabIndexesOf(TAB_WIDTHS, GAP, 307, 0)).toStrictEqual([0, 1])
  })

  it("drops tabs from the end until the open tab fits after them", () => {
    expect(fittingTabIndexesOf(TAB_WIDTHS, GAP, 308, 5)).toStrictEqual([0, 1, 5])
  })

  it("drops as many tabs as a wide open tab needs", () => {
    expect(fittingTabIndexesOf([100, 100, 100, 250], GAP, 308, 3)).toStrictEqual([3])
  })

  it("shows the open tab alone when even it is wider than the room", () => {
    expect(fittingTabIndexesOf(TAB_WIDTHS, GAP, 50, 4)).toStrictEqual([4])
  })
})

describe("visibleTabIndexesOf", () => {
  const measuresOf = (rowWidth: number) => ({ tabWidths: TAB_WIDTHS, gap: GAP, rowWidth, moreButtonWidth: MORE_BUTTON_WIDTH })

  it("shows every tab when they all fit on the row", () => {
    expect(visibleTabIndexesOf(measuresOf(620), TAB_WIDTHS.length, 0)).toStrictEqual([0, 1, 2, 3, 4, 5])
  })

  it("leaves room for the More button when the tabs do not all fit", () => {
    expect(visibleTabIndexesOf(measuresOf(382), TAB_WIDTHS.length, 0)).toStrictEqual([0, 1, 2])
    expect(visibleTabIndexesOf(measuresOf(381), TAB_WIDTHS.length, 0)).toStrictEqual([0, 1])
  })

  it("keeps the open tab on the row when it would overflow", () => {
    expect(visibleTabIndexesOf(measuresOf(382), TAB_WIDTHS.length, 4)).toStrictEqual([0, 1, 4])
  })

  it("shows every tab when the row has not been measured", () => {
    expect(visibleTabIndexesOf({ tabWidths: [], gap: 0, rowWidth: 0, moreButtonWidth: 0 }, 3, 2)).toStrictEqual([0, 1, 2])
    expect(visibleTabIndexesOf({ tabWidths: [0, 0, 0], gap: 0, rowWidth: 0, moreButtonWidth: 0 }, 3, 2)).toStrictEqual([0, 1, 2])
  })

  it("shows every tab while the widths it has were measured for other tabs", () => {
    expect(visibleTabIndexesOf(measuresOf(382), 4, 0)).toStrictEqual([0, 1, 2, 3])
  })
})
