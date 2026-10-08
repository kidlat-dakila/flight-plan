import { layoutLayers, type LayeredItem, type LayeredLink, type LayerSpacing } from "@/journey/layered-layout"

const spacing: LayerSpacing = { itemGap: 40, laneGap: 20, columnGap: 72, widestColumnGap: 200, margin: 24 }

const itemOf = (id: string, height = 60): LayeredItem => ({ id, width: 200, height })

const linkBetween = (fromId: string, toId: string, fromOffsetY: number | null = null): LayeredLink => ({
  id: `${fromId}>${toId}`,
  fromId,
  toId,
  fromOffsetY,
  toOffsetY: null,
})

const boxOf = (layout: ReturnType<typeof layoutLayers>, id: string) => layout.boxes.get(id) ?? { x: 0, y: 0, width: 0, height: 0 }

const routeOf = (layout: ReturnType<typeof layoutLayers>, id: string) => layout.routes.get(id) ?? []

describe("layoutLayers", () => {
  it("puts each item one column after the item that leads to it, and draws the link between them as one level line", () => {
    const layout = layoutLayers([itemOf("visit"), itemOf("page"), itemOf("store")], [linkBetween("visit", "page"), linkBetween("page", "store")], spacing)
    const [visit, page, store] = ["visit", "page", "store"].map((id) => boxOf(layout, id))

    expect(visit.x + visit.width).toBeLessThan(page.x)
    expect(page.x + page.width).toBeLessThan(store.x)
    expect(routeOf(layout, "visit>page")).toStrictEqual([
      { x: visit.x + visit.width, y: visit.y + 30 },
      { x: page.x, y: page.y + 30 },
    ])
    expect(visit.y).toBe(page.y)
    expect(page.y).toBe(store.y)
  })

  it("orders the items of a column by the height their links leave from, so the links do not cross", () => {
    const layout = layoutLayers(
      [itemOf("card", 300), itemOf("low"), itemOf("high")],
      [linkBetween("card", "low", 260), linkBetween("card", "high", 40)],
      spacing,
    )

    expect(boxOf(layout, "high").y).toBeLessThan(boxOf(layout, "low").y)
  })

  it("puts an item nothing leads to beside the item it leads to", () => {
    const layout = layoutLayers(
      [itemOf("visit"), itemOf("page"), itemOf("store"), itemOf("click")],
      [linkBetween("visit", "page"), linkBetween("page", "store"), linkBetween("click", "store")],
      spacing,
    )

    expect(boxOf(layout, "click").x).toBe(boxOf(layout, "page").x)
  })

  it("leads a link that skips a column level past the items of that column, clear of every one of them", () => {
    const layout = layoutLayers(
      [itemOf("page"), itemOf("hook"), itemOf("store")],
      [linkBetween("page", "hook"), linkBetween("hook", "store"), linkBetween("page", "store")],
      spacing,
    )
    const hook = boxOf(layout, "hook")
    const [, laneStart, laneEnd] = routeOf(layout, "page>store")

    expect(routeOf(layout, "page>store")).toHaveLength(4)
    expect(laneStart).toMatchObject({ x: hook.x })
    expect(laneEnd).toStrictEqual({ x: hook.x + hook.width, y: laneStart.y })
    expect(laneStart.y < hook.y || laneStart.y > hook.y + hook.height).toBe(true)
  })

  it("keeps two items of one column apart and inside the board", () => {
    const layout = layoutLayers([itemOf("page"), itemOf("one"), itemOf("two")], [linkBetween("page", "one"), linkBetween("page", "two")], spacing)
    const [one, two] = [boxOf(layout, "one"), boxOf(layout, "two")]

    expect(Math.abs(one.y - two.y)).toBeGreaterThanOrEqual(one.height + spacing.itemGap)
    expect(Math.min(one.y, two.y)).toBeGreaterThanOrEqual(spacing.margin)
    expect(Math.max(one.y, two.y) + one.height).toBeLessThanOrEqual(layout.height - spacing.margin)
  })

  it("lays out two items that lead to each other without going round forever", () => {
    const layout = layoutLayers([itemOf("one"), itemOf("two")], [linkBetween("one", "two"), linkBetween("two", "one")], spacing)

    expect(boxOf(layout, "one").x).toBeLessThan(boxOf(layout, "two").x)
    expect(routeOf(layout, "two>one")).toHaveLength(2)
  })
})
