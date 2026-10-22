import { useStore } from "zustand"
import { createStore, type StoreApi } from "zustand/vanilla"

export interface WaypointVisit {
  readonly anchorId: string
  readonly waypointId: string
  readonly isOpening: boolean
  readonly count: number
}

export interface HeldPlace {
  readonly anchorId: string
  readonly count: number
}

export interface WalkthroughState {
  readonly openWaypointIds: ReadonlySet<string>
  readonly currentWaypointId: string | null
  readonly focusedWaypointId: string | null
  readonly visit: WaypointVisit | null
  readonly collapsedAnchorIds: ReadonlySet<string>
  readonly holdingAnchorId: string | null
  readonly heldPlace: HeldPlace | null
}

export type WalkthroughStore = StoreApi<WalkthroughState>

interface VisitedWaypoint {
  readonly id: string
  readonly anchorId: string
}

const NOTHING: ReadonlySet<string> = new Set()

const START_STATE: WalkthroughState = {
  openWaypointIds: NOTHING,
  currentWaypointId: null,
  focusedWaypointId: null,
  visit: null,
  collapsedAnchorIds: NOTHING,
  holdingAnchorId: null,
  heldPlace: null,
}

const withAdded = (ids: ReadonlySet<string>, addedIds: readonly string[]): ReadonlySet<string> => new Set([...ids, ...addedIds])

const withRemoved = (ids: ReadonlySet<string>, removedIds: readonly string[]): ReadonlySet<string> =>
  new Set([...ids].filter((id) => !removedIds.includes(id)))

const withToggled = (ids: ReadonlySet<string>, toggledId: string): ReadonlySet<string> =>
  (ids.has(toggledId) ? withRemoved(ids, [toggledId]) : withAdded(ids, [toggledId]))

export const withHoldingFile = (state: WalkthroughState, holdingAnchorId: string | null): WalkthroughState =>
  state.holdingAnchorId === holdingAnchorId
    ? state
    : {
        ...state,
        holdingAnchorId,
        collapsedAnchorIds: holdingAnchorId === null ? state.collapsedAnchorIds : withRemoved(state.collapsedAnchorIds, [holdingAnchorId]),
      }

const withCurrentWaypoint = (state: WalkthroughState, waypointId: string, holdingAnchorId: string | null): WalkthroughState =>
  withHoldingFile({ ...state, currentWaypointId: waypointId }, holdingAnchorId)

export const withToggledWaypoint = (state: WalkthroughState, waypointId: string, holdingAnchorId: string | null): WalkthroughState =>
  withCurrentWaypoint({ ...state, openWaypointIds: withToggled(state.openWaypointIds, waypointId) }, waypointId, holdingAnchorId)

export const withVisit = (state: WalkthroughState, waypoint: VisitedWaypoint, isOpening: boolean, holdingAnchorId: string | null): WalkthroughState =>
  withCurrentWaypoint(
    {
      ...state,
      focusedWaypointId: waypoint.id,
      openWaypointIds: isOpening ? withAdded(state.openWaypointIds, [waypoint.id]) : state.openWaypointIds,
      visit: { anchorId: waypoint.anchorId, waypointId: waypoint.id, isOpening, count: (state.visit?.count ?? 0) + 1 },
    },
    waypoint.id,
    holdingAnchorId,
  )

export const withPreviewedWaypoint = (state: WalkthroughState, waypointId: string, holdingAnchorId: string | null): WalkthroughState =>
  state.currentWaypointId === waypointId ? state : withCurrentWaypoint(state, waypointId, holdingAnchorId)

export const withSectionEntered = (state: WalkthroughState, waypointId: string, holdingAnchorId: string | null): WalkthroughState =>
  withCurrentWaypoint({ ...state, focusedWaypointId: null }, waypointId, holdingAnchorId)

export const withoutCurrentOpen = (state: WalkthroughState): WalkthroughState =>
  state.currentWaypointId === null ? state : { ...state, openWaypointIds: withRemoved(state.openWaypointIds, [state.currentWaypointId]) }

export const withoutFocus = (state: WalkthroughState): WalkthroughState =>
  state.focusedWaypointId === null ? state : { ...state, focusedWaypointId: null }

export const withFilesCollapsed = (
  state: WalkthroughState,
  anchorIds: readonly string[],
  isCollapsed: boolean,
  heldAnchorId: string | null,
): WalkthroughState => ({
  ...state,
  collapsedAnchorIds: isCollapsed ? withAdded(state.collapsedAnchorIds, anchorIds) : withRemoved(state.collapsedAnchorIds, anchorIds),
  heldPlace: heldAnchorId === null ? state.heldPlace : { anchorId: heldAnchorId, count: (state.heldPlace?.count ?? 0) + 1 },
})

export const createWalkthroughStore = (): WalkthroughStore => createStore<WalkthroughState>(() => START_STATE)

export const updateWalkthrough = (store: WalkthroughStore, change: (state: WalkthroughState) => WalkthroughState): void => {
  store.setState(change, true)
}

export const useWalkthroughState = (store: WalkthroughStore): WalkthroughState => useStore(store)
