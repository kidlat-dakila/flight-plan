import { createJSONStorage, persist, type StateStorage } from "zustand/middleware"
import { createStore } from "zustand/vanilla"
import {
  DEFAULT_REVIEW_MODE,
  EMPTY_GUIDE_RECORD,
  withActionUse,
  withDeferral,
  withFirstVisit,
  withTriggerStates,
  type DeferralReason,
  type GuideRecord,
  type GuideTriggers,
  type ReviewMode,
  type TriggerStates,
} from "@/lib/guide-tooltips/triggers"

export type GuideEventKind = "view" | "user-action" | "user-hover"

export interface GuideState extends GuideRecord {
  readonly visibleViewIds: readonly string[]
  readonly reviewMode: ReviewMode
  readonly triggersById: Readonly<Partial<Record<string, GuideTriggers>>>
  readonly shownTooltipIds: readonly string[]
  readonly sendEvent: (kind: GuideEventKind, targetId: string) => void
  readonly updateTooltipState: (tooltipId: string, change: TriggerStates) => void
  readonly deferTooltip: (tooltipId: string, reason: DeferralReason) => void
  readonly turnTipsOff: () => void
  readonly recordFirstVisit: () => void
  readonly setVisibleViewIds: (viewIds: readonly string[]) => void
  readonly setReviewMode: (mode: ReviewMode) => void
  readonly registerTriggers: (tooltipId: string, triggers: GuideTriggers) => void
  readonly unregisterTriggers: (tooltipId: string) => void
  readonly showTooltip: (tooltipId: string) => void
  readonly hideTooltip: (tooltipId: string) => void
}

export const GUIDE_STORAGE_KEY = "flightplan-guide-tooltips"

const GUIDE_STORAGE_VERSION = 1

const readStoredItem = (name: string): string | null => {
  try {
    return window.localStorage.getItem(name)
  } catch {
    return null
  }
}

const writeStoredItem = (name: string, value: string): boolean => {
  try {
    window.localStorage.setItem(name, value)
    return true
  } catch {
    return false
  }
}

const removeStoredItem = (name: string): boolean => {
  try {
    window.localStorage.removeItem(name)
    return true
  } catch {
    return false
  }
}

const SAFE_LOCAL_STORAGE: StateStorage = { getItem: readStoredItem, setItem: writeStoredItem, removeItem: removeStoredItem }

const recordOf = (state: GuideState): GuideRecord => ({
  firstSeenAt: state.firstSeenAt,
  isOff: state.isOff,
  tooltips: state.tooltips,
  deferredAt: state.deferredAt,
  actions: state.actions,
})

const withoutKey = <T>(entries: Readonly<Record<string, T>>, key: string): Readonly<Record<string, T>> =>
  Object.fromEntries(Object.entries(entries).filter(([entryKey]) => entryKey !== key))

const withViewId = (viewIds: readonly string[], viewId: string): readonly string[] =>
  viewIds.includes(viewId) ? viewIds : [...viewIds, viewId]

const haveSameIds = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((id, position) => id === right[position])

export const guideTooltipStore = createStore<GuideState>()(
  persist(
    (set, get) => ({
      ...EMPTY_GUIDE_RECORD,
      visibleViewIds: [],
      reviewMode: DEFAULT_REVIEW_MODE,
      triggersById: {},
      shownTooltipIds: [],
      sendEvent: (kind, targetId) => {
        if (kind === "view") {
          set((state) => ({ visibleViewIds: withViewId(state.visibleViewIds, targetId) }))
          return
        }
        set((state) => withActionUse(recordOf(state), targetId, kind === "user-action" ? "click" : "hover", Date.now()))
      },
      updateTooltipState: (tooltipId, change) => {
        set((state) => withTriggerStates(recordOf(state), tooltipId, change))
      },
      deferTooltip: (tooltipId, reason) => {
        set((state) => withDeferral(recordOf(state), tooltipId, reason, Date.now()))
      },
      turnTipsOff: () => {
        set({ isOff: true })
      },
      recordFirstVisit: () => {
        if (get().firstSeenAt === null) set((state) => withFirstVisit(recordOf(state), Date.now()))
      },
      setVisibleViewIds: (viewIds) => {
        if (!haveSameIds(get().visibleViewIds, viewIds)) set({ visibleViewIds: viewIds })
      },
      setReviewMode: (mode) => {
        set({ reviewMode: mode })
      },
      registerTriggers: (tooltipId, triggers) => {
        set((state) => ({ triggersById: { ...state.triggersById, [tooltipId]: triggers } }))
      },
      unregisterTriggers: (tooltipId) => {
        set((state) => ({ triggersById: withoutKey(state.triggersById, tooltipId) }))
      },
      showTooltip: (tooltipId) => {
        set((state) => ({ shownTooltipIds: [...state.shownTooltipIds.filter((id) => id !== tooltipId), tooltipId] }))
      },
      hideTooltip: (tooltipId) => {
        set((state) => ({ shownTooltipIds: state.shownTooltipIds.filter((id) => id !== tooltipId) }))
      },
    }),
    {
      name: GUIDE_STORAGE_KEY,
      version: GUIDE_STORAGE_VERSION,
      storage: createJSONStorage(() => SAFE_LOCAL_STORAGE),
      partialize: recordOf,
    },
  ),
)

export const resetGuideTooltipStore = (): void => {
  guideTooltipStore.setState({
    ...EMPTY_GUIDE_RECORD,
    visibleViewIds: [],
    reviewMode: DEFAULT_REVIEW_MODE,
    triggersById: {},
    shownTooltipIds: [],
  })
}
