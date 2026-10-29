import type { TraceCalleeCardView, TraceRenderGroupView, TraceRowGroupView } from "@flightplan/configurations"

export interface ComponentGroupRows {
  readonly propIds: readonly string[]
  readonly stateIds: readonly string[]
  readonly calleeCards: readonly TraceCalleeCardView[]
  readonly memoIds: readonly string[]
  readonly effectIds: readonly string[]
  readonly triggerIds: readonly string[]
  readonly renderGroups: readonly TraceRenderGroupView[]
  readonly otherChildIds: readonly string[]
}

const PROPS_LABEL = "Props"
const STATE_LABEL = "State"
const CALLS_LABEL = "External calls"
const MEMOS_LABEL = "Memos"
const EFFECTS_LABEL = "Effects"
const TRIGGERS_LABEL = "Triggers"
const RENDERS_LABEL = "Renders"

const groupOf = (label: string | null, rowIds: readonly string[], childIds: readonly string[] = []): TraceRowGroupView => ({ label, rowIds: [...rowIds], childIds: [...childIds] })

const isFilled = ({ rowIds, childIds, calleeCards, renderGroups }: TraceRowGroupView): boolean =>
  calleeCards !== undefined || (renderGroups ?? []).length > 0 || rowIds.length > 0 || childIds.length > 0

export const listComponentGroups = (rows: ComponentGroupRows): TraceRowGroupView[] => [
  groupOf(PROPS_LABEL, rows.propIds),
  groupOf(STATE_LABEL, rows.stateIds),
  { ...groupOf(CALLS_LABEL, []), calleeCards: [...rows.calleeCards] },
  groupOf(MEMOS_LABEL, rows.memoIds),
  groupOf(EFFECTS_LABEL, rows.effectIds),
  groupOf(TRIGGERS_LABEL, rows.triggerIds),
  { ...groupOf(RENDERS_LABEL, []), renderGroups: [...rows.renderGroups] },
  groupOf(null, [], rows.otherChildIds),
].filter(isFilled)
