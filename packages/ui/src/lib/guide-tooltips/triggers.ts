export type ReviewMode = "user" | "teammate"

export type ActionUse = "click" | "hover" | "click-or-hover"

export interface FeatureUse {
  readonly actionIds: readonly string[]
  readonly use?: ActionUse
  readonly times?: number
}

export type FeatureUseTrigger = readonly string[] | FeatureUse

export interface TooltipAndDay {
  readonly dayBound: number
  readonly tooltipDependent: readonly string[]
}

export interface GuideTriggers {
  readonly viewVisible?: readonly string[]
  readonly tooltipDependent?: readonly string[]
  readonly preFeatureUse?: FeatureUseTrigger
  readonly postFeatureUse?: FeatureUseTrigger
  readonly dayBound?: number
  readonly tooltipAndDay?: TooltipAndDay
  readonly reviewMode?: ReviewMode
  readonly dependsOnValues?: Readonly<Record<string, boolean>>
}

export type TriggerKey = keyof GuideTriggers | "userDeferred"

export type TriggerStates = Readonly<Partial<Record<TriggerKey, Readonly<Record<string, boolean>>>>>

export type TooltipStates = Readonly<Partial<Record<string, TriggerStates>>>

export interface ActionRecord {
  readonly clickCount: number
  readonly hoverCount: number
  readonly firstClickedAt: number | null
  readonly firstHoveredAt: number | null
}

export type ActionLog = Readonly<Partial<Record<string, ActionRecord>>>

export interface GuideRecord {
  readonly firstSeenAt: number | null
  readonly isOff: boolean
  readonly tooltips: TooltipStates
  readonly deferredAt: Readonly<Partial<Record<string, number>>>
  readonly actions: ActionLog
}

export interface GuideMoment {
  readonly now: number
  readonly visibleViewIds: readonly string[]
  readonly reviewMode: ReviewMode
  readonly triggersById: Readonly<Partial<Record<string, GuideTriggers>>>
}

export type DeferralReason = "close-button" | "got-it"

export const DEFAULT_REVIEW_MODE: ReviewMode = "teammate"

export const DAY_MS = 86_400_000

export const EMPTY_GUIDE_RECORD: GuideRecord = { firstSeenAt: null, isOff: false, tooltips: {}, deferredAt: {}, actions: {} }

const EMPTY_ACTION_RECORD: ActionRecord = { clickCount: 0, hoverCount: 0, firstClickedAt: null, firstHoveredAt: null }

const DEFAULT_USE: ActionUse = "click"

const DEFAULT_TIMES = 1

const DAY_BOUND_TARGET = "days"

const TRIGGER_KEYS: readonly TriggerKey[] = [
  "viewVisible",
  "tooltipDependent",
  "preFeatureUse",
  "postFeatureUse",
  "dayBound",
  "tooltipAndDay",
  "reviewMode",
  "dependsOnValues",
  "userDeferred",
]

const toFeatureUse = (trigger: FeatureUseTrigger): FeatureUse =>
  "actionIds" in trigger ? trigger : { actionIds: trigger }

const actionRecordOf = (record: GuideRecord, actionId: string): ActionRecord => record.actions[actionId] ?? EMPTY_ACTION_RECORD

const countOf = (action: ActionRecord, use: ActionUse): number => {
  if (use === "click") return action.clickCount
  if (use === "hover") return action.hoverCount
  return action.clickCount + action.hoverCount
}

const firstUsedAtOf = (action: ActionRecord, use: ActionUse): number | null => {
  if (use === "click") return action.firstClickedAt
  if (use === "hover") return action.firstHoveredAt
  const times = [action.firstClickedAt, action.firstHoveredAt].filter((time) => time !== null)
  return times.length === 0 ? null : Math.min(...times)
}

const isOverridden = (record: GuideRecord, tooltipId: string, key: TriggerKey, target: string): boolean =>
  record.tooltips[tooltipId]?.[key]?.[target] === true

const isFeatureUseMet = (record: GuideRecord, tooltipId: string, key: "preFeatureUse" | "postFeatureUse", trigger: FeatureUseTrigger): boolean => {
  const { actionIds, use = DEFAULT_USE, times = DEFAULT_TIMES } = toFeatureUse(trigger)
  if (actionIds.some((actionId) => isOverridden(record, tooltipId, key, actionId))) return true
  const count = actionIds.reduce((total, actionId) => total + countOf(actionRecordOf(record, actionId), use), 0)
  return count >= times
}

const featureFirstUsedAtOf = (record: GuideRecord, trigger: FeatureUseTrigger): number | null => {
  const { actionIds, use = DEFAULT_USE } = toFeatureUse(trigger)
  const times = actionIds.map((actionId) => firstUsedAtOf(actionRecordOf(record, actionId), use)).filter((time) => time !== null)
  return times.length === 0 ? null : Math.min(...times)
}

export const withActionUse = (record: GuideRecord, actionId: string, use: "click" | "hover", now: number): GuideRecord => {
  const action = actionRecordOf(record, actionId)
  const usedAction: ActionRecord = use === "click"
    ? { ...action, clickCount: action.clickCount + 1, firstClickedAt: action.firstClickedAt ?? now }
    : { ...action, hoverCount: action.hoverCount + 1, firstHoveredAt: action.firstHoveredAt ?? now }
  return { ...record, actions: { ...record.actions, [actionId]: usedAction } }
}

export const withTriggerStates = (record: GuideRecord, tooltipId: string, change: TriggerStates): GuideRecord => {
  const current = record.tooltips[tooltipId] ?? {}
  const merged = Object.fromEntries(
    TRIGGER_KEYS.flatMap((key) => {
      const targets = change[key]
      return targets === undefined ? [] : [[key, { ...current[key], ...targets }]]
    }),
  )
  return { ...record, tooltips: { ...record.tooltips, [tooltipId]: { ...current, ...merged } } }
}

export const withDeferral = (record: GuideRecord, tooltipId: string, reason: DeferralReason, now: number): GuideRecord => ({
  ...withTriggerStates(record, tooltipId, { userDeferred: { [reason]: true } }),
  deferredAt: { ...record.deferredAt, [tooltipId]: record.deferredAt[tooltipId] ?? now },
})

export const withFirstVisit = (record: GuideRecord, now: number): GuideRecord =>
  record.firstSeenAt === null ? { ...record, firstSeenAt: now } : record

export const isDeferred = (record: GuideRecord, tooltipId: string): boolean =>
  Object.values(record.tooltips[tooltipId]?.userDeferred ?? {}).some((isSet) => isSet)

export const isResolved = (record: GuideRecord, tooltipId: string, triggers: GuideTriggers | undefined): boolean =>
  isDeferred(record, tooltipId)
  || (triggers?.preFeatureUse !== undefined && isFeatureUseMet(record, tooltipId, "preFeatureUse", triggers.preFeatureUse))

export const resolvedAtOf = (record: GuideRecord, tooltipId: string, triggers: GuideTriggers | undefined): number | null => {
  if (!isResolved(record, tooltipId, triggers)) return null
  const times = [
    record.deferredAt[tooltipId] ?? null,
    triggers?.preFeatureUse === undefined ? null : featureFirstUsedAtOf(record, triggers.preFeatureUse),
  ].filter((time) => time !== null)
  return times.length === 0 ? record.firstSeenAt : Math.min(...times)
}

const hasElapsedDays = (since: number | null, days: number, now: number): boolean =>
  since !== null && now - since >= days * DAY_MS

const isViewVisibleMet = (record: GuideRecord, tooltipId: string, viewIds: readonly string[], moment: GuideMoment): boolean =>
  viewIds.some((viewId) => moment.visibleViewIds.includes(viewId) || isOverridden(record, tooltipId, "viewVisible", viewId))

const areDependenciesResolved = (record: GuideRecord, tooltipId: string, key: TriggerKey, dependencyIds: readonly string[], moment: GuideMoment): boolean =>
  dependencyIds.every((dependencyId) =>
    isOverridden(record, tooltipId, key, dependencyId) || isResolved(record, dependencyId, moment.triggersById[dependencyId]))

const isTooltipAndDayMet = (record: GuideRecord, tooltipId: string, trigger: TooltipAndDay, moment: GuideMoment): boolean => {
  if (!areDependenciesResolved(record, tooltipId, "tooltipAndDay", trigger.tooltipDependent, moment)) return false
  const resolvedTimes = trigger.tooltipDependent.map((dependencyId) => resolvedAtOf(record, dependencyId, moment.triggersById[dependencyId]))
  const latest = resolvedTimes.some((time) => time === null) ? null : Math.max(...resolvedTimes.filter((time) => time !== null))
  return hasElapsedDays(latest, trigger.dayBound, moment.now)
}

const areValuesTrue = (values: Readonly<Record<string, boolean>>): boolean => Object.values(values).every((isTrue) => isTrue)

export const unmetTriggerKeysOf = (record: GuideRecord, tooltipId: string, triggers: GuideTriggers, moment: GuideMoment): readonly TriggerKey[] => {
  const checks: readonly (readonly [TriggerKey, boolean])[] = [
    ["userDeferred", !isDeferred(record, tooltipId)],
    ["viewVisible", triggers.viewVisible === undefined || isViewVisibleMet(record, tooltipId, triggers.viewVisible, moment)],
    ["tooltipDependent", triggers.tooltipDependent === undefined || areDependenciesResolved(record, tooltipId, "tooltipDependent", triggers.tooltipDependent, moment)],
    ["preFeatureUse", triggers.preFeatureUse === undefined || !isFeatureUseMet(record, tooltipId, "preFeatureUse", triggers.preFeatureUse)],
    ["postFeatureUse", triggers.postFeatureUse === undefined || isFeatureUseMet(record, tooltipId, "postFeatureUse", triggers.postFeatureUse)],
    ["dayBound", triggers.dayBound === undefined || isOverridden(record, tooltipId, "dayBound", DAY_BOUND_TARGET) || hasElapsedDays(record.firstSeenAt, triggers.dayBound, moment.now)],
    ["tooltipAndDay", triggers.tooltipAndDay === undefined || isTooltipAndDayMet(record, tooltipId, triggers.tooltipAndDay, moment)],
    ["reviewMode", (triggers.reviewMode ?? DEFAULT_REVIEW_MODE) === moment.reviewMode],
    ["dependsOnValues", triggers.dependsOnValues === undefined || areValuesTrue(triggers.dependsOnValues)],
  ]
  return checks.filter(([, isMet]) => !isMet).map(([key]) => key)
}

export const isTooltipReady = (record: GuideRecord, tooltipId: string, triggers: GuideTriggers, moment: GuideMoment): boolean =>
  !record.isOff && unmetTriggerKeysOf(record, tooltipId, triggers, moment).length === 0
