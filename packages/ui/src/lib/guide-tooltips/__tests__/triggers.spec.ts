import {
  DAY_MS,
  EMPTY_GUIDE_RECORD,
  isResolved,
  isTooltipReady,
  resolvedAtOf,
  unmetTriggerKeysOf,
  withActionUse,
  withDeferral,
  withFirstVisit,
  withTriggerStates,
  type GuideMoment,
  type GuideRecord,
  type GuideTriggers,
} from "@/lib/guide-tooltips/triggers"

const NOW = 10 * DAY_MS
const TIP = "tip"
const OTHER_TIP = "other-tip"

const momentOf = (change: Partial<GuideMoment> = {}): GuideMoment => ({
  now: NOW,
  visibleViewIds: [],
  reviewMode: "teammate",
  triggersById: {},
  ...change,
})

const unmetOf = (triggers: GuideTriggers, record: GuideRecord = EMPTY_GUIDE_RECORD, moment: GuideMoment = momentOf()) =>
  unmetTriggerKeysOf(record, TIP, triggers, moment)

describe("guide tooltip triggers", () => {
  it("is ready with no trigger beyond the default review mode", () => {
    expect(isTooltipReady(EMPTY_GUIDE_RECORD, TIP, {}, momentOf())).toBe(true)
  })

  it("waits for one of its views to be on screen", () => {
    const triggers: GuideTriggers = { viewVisible: ["context-section", "change-overview-section"] }

    expect(unmetOf(triggers)).toStrictEqual(["viewVisible"])
    expect(unmetOf(triggers, EMPTY_GUIDE_RECORD, momentOf({ visibleViewIds: ["change-overview-section"] }))).toStrictEqual([])
  })

  it("stops once a feature it introduces was used, and counts that as resolved", () => {
    const triggers: GuideTriggers = { preFeatureUse: ["jump-to-action"] }
    const used = withActionUse(EMPTY_GUIDE_RECORD, "jump-to-action", "click", NOW)

    expect(unmetOf(triggers, used)).toContain("preFeatureUse")
    expect(isResolved(used, TIP, triggers)).toBe(true)
  })

  it("tells a hover from a click when the trigger asks for one", () => {
    const hovered = withActionUse(EMPTY_GUIDE_RECORD, "card-action", "hover", NOW)

    expect(unmetOf({ preFeatureUse: ["card-action"] }, hovered)).toStrictEqual([])
    expect(unmetOf({ preFeatureUse: { actionIds: ["card-action"], use: "click-or-hover" } }, hovered)).toStrictEqual(["preFeatureUse"])
  })

  it("waits for a feature to be used enough times, counted across its actions", () => {
    const triggers: GuideTriggers = { postFeatureUse: { actionIds: ["next-action", "previous-action"], times: 3 } }
    const twice = withActionUse(withActionUse(EMPTY_GUIDE_RECORD, "next-action", "click", NOW), "previous-action", "click", NOW)
    const thrice = withActionUse(twice, "next-action", "click", NOW)

    expect(unmetOf(triggers, twice)).toStrictEqual(["postFeatureUse"])
    expect(unmetOf(triggers, thrice)).toStrictEqual([])
  })

  it("waits for the tooltips it depends on to be closed or their feature used", () => {
    const triggers: GuideTriggers = { tooltipDependent: [OTHER_TIP] }
    const moment = momentOf({ triggersById: { [OTHER_TIP]: { preFeatureUse: ["next-action"] } } })

    expect(unmetOf(triggers, EMPTY_GUIDE_RECORD, moment)).toStrictEqual(["tooltipDependent"])
    expect(unmetOf(triggers, withDeferral(EMPTY_GUIDE_RECORD, OTHER_TIP, "got-it", NOW), moment)).toStrictEqual([])
    expect(unmetOf(triggers, withActionUse(EMPTY_GUIDE_RECORD, "next-action", "click", NOW), moment)).toStrictEqual([])
  })

  it("counts days from the first visit", () => {
    const triggers: GuideTriggers = { dayBound: 1 }

    expect(unmetOf(triggers)).toStrictEqual(["dayBound"])
    expect(unmetOf(triggers, withFirstVisit(EMPTY_GUIDE_RECORD, NOW - DAY_MS / 2))).toStrictEqual(["dayBound"])
    expect(unmetOf(triggers, withFirstVisit(EMPTY_GUIDE_RECORD, NOW - DAY_MS))).toStrictEqual([])
  })

  it("counts the days of tooltipAndDay from when the earlier tooltip was resolved", () => {
    const triggers: GuideTriggers = { tooltipAndDay: { dayBound: 2, tooltipDependent: [OTHER_TIP] } }
    const seenLongAgo = withFirstVisit(EMPTY_GUIDE_RECORD, 0)

    expect(unmetOf(triggers, seenLongAgo)).toStrictEqual(["tooltipAndDay"])
    expect(unmetOf(triggers, withDeferral(seenLongAgo, OTHER_TIP, "got-it", NOW - DAY_MS))).toStrictEqual(["tooltipAndDay"])
    expect(unmetOf(triggers, withDeferral(seenLongAgo, OTHER_TIP, "got-it", NOW - 2 * DAY_MS))).toStrictEqual([])
  })

  it("shows only in its review mode, a teammate's review by default", () => {
    expect(unmetOf({}, EMPTY_GUIDE_RECORD, momentOf({ reviewMode: "user" }))).toStrictEqual(["reviewMode"])
    expect(unmetOf({ reviewMode: "user" }, EMPTY_GUIDE_RECORD, momentOf({ reviewMode: "user" }))).toStrictEqual([])
  })

  it("waits for every value it depends on to be true", () => {
    expect(unmetOf({ dependsOnValues: { isWaypointMissingDescription: false } })).toStrictEqual(["dependsOnValues"])
    expect(unmetOf({ dependsOnValues: { isWaypointMissingDescription: true } })).toStrictEqual([])
  })

  it("never shows again once it was closed", () => {
    expect(unmetOf({}, withDeferral(EMPTY_GUIDE_RECORD, TIP, "close-button", NOW))).toStrictEqual(["userDeferred"])
  })

  it("lets a stored trigger state stand for a condition", () => {
    const record = withTriggerStates(EMPTY_GUIDE_RECORD, TIP, { viewVisible: { "blast-diagram-section": true } })

    expect(unmetOf({ viewVisible: ["blast-diagram-section"] }, record)).toStrictEqual([])
  })

  it("shows nothing once tips are turned off", () => {
    expect(isTooltipReady({ ...EMPTY_GUIDE_RECORD, isOff: true }, TIP, {}, momentOf())).toBe(false)
  })

  it("dates a resolution by the earliest close or use", () => {
    const triggers: GuideTriggers = { preFeatureUse: ["jump-to-action"] }
    const used = withActionUse(EMPTY_GUIDE_RECORD, "jump-to-action", "click", NOW - DAY_MS)

    expect(resolvedAtOf(EMPTY_GUIDE_RECORD, TIP, triggers)).toBeNull()
    expect(resolvedAtOf(withDeferral(used, TIP, "got-it", NOW), TIP, triggers)).toBe(NOW - DAY_MS)
  })

  it("keeps the first visit and the first use of an action", () => {
    const visited = withFirstVisit(withFirstVisit(EMPTY_GUIDE_RECORD, 1), 2)
    const used = withActionUse(withActionUse(visited, "jump-to-action", "click", 5), "jump-to-action", "click", 9)

    expect(used.firstSeenAt).toBe(1)
    expect(used.actions["jump-to-action"]).toStrictEqual({ clickCount: 2, hoverCount: 0, firstClickedAt: 5, firstHoveredAt: null })
  })
})
