import { GUIDE_STORAGE_KEY, guideTooltipStore, resetGuideTooltipStore } from "@/lib/guide-tooltips/store"

const storedRecord = (): unknown => JSON.parse(window.localStorage.getItem(GUIDE_STORAGE_KEY) ?? "null")

describe("guide tooltip store", () => {
  beforeEach(() => {
    resetGuideTooltipStore()
  })

  it("logs every action and hover, whether a tooltip asks for it or not", () => {
    guideTooltipStore.getState().sendEvent("user-action", "share-action")
    guideTooltipStore.getState().sendEvent("user-hover", "share-action")

    expect(guideTooltipStore.getState().actions["share-action"]).toMatchObject({ clickCount: 1, hoverCount: 1 })
  })

  it("keeps a view event on screen without storing it", () => {
    guideTooltipStore.getState().sendEvent("view", "waypoint-card-section")

    expect(guideTooltipStore.getState().visibleViewIds).toStrictEqual(["waypoint-card-section"])
    expect(storedRecord()).toMatchObject({ state: { actions: {} }, version: 1 })
    expect(JSON.stringify(storedRecord())).not.toContain("waypoint-card-section")
  })

  it("stores a closed tooltip in the shape of the trigger states", () => {
    guideTooltipStore.getState().deferTooltip("jump-to-action-tooltip", "got-it")

    expect(storedRecord()).toMatchObject({ state: { tooltips: { "jump-to-action-tooltip": { userDeferred: { "got-it": true } } } } })
  })

  it("merges a trigger state into what the tooltip already holds", () => {
    const { updateTooltipState } = guideTooltipStore.getState()
    updateTooltipState("filter-waypoint-tooltip", { preFeatureUse: { "filter-action": true } })
    updateTooltipState("filter-waypoint-tooltip", { preFeatureUse: { "next-waypoint-action": false } })

    expect(guideTooltipStore.getState().tooltips["filter-waypoint-tooltip"]).toStrictEqual({
      preFeatureUse: { "filter-action": true, "next-waypoint-action": false },
    })
  })

  it("records the first visit once", () => {
    guideTooltipStore.getState().recordFirstVisit()
    const firstSeenAt = guideTooltipStore.getState().firstSeenAt
    guideTooltipStore.getState().recordFirstVisit()

    expect(firstSeenAt).not.toBeNull()
    expect(guideTooltipStore.getState().firstSeenAt).toBe(firstSeenAt)
  })
})
