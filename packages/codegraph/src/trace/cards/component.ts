import type { ListedBlock } from "@/trace-diagram/listed-blocks"
import type { TraceRowGroupView, NodeBlockListKind, TriggerLabel } from "@flightplan/configurations"
import { BLOCK_LIST_LABELS, EXTERNAL_CALL, idsOf, KINDS_BEFORE_CALLS, labelOfRow, STEP } from "./labels"

const TRIGGERS_LABEL = "Triggers"

const groupOf = (label: string, rowIds: readonly string[]): TraceRowGroupView => ({ label, rowIds: [...rowIds], childIds: [] })

export const listComponentGroups = (rows: readonly ListedBlock[], triggers: readonly TriggerLabel[]): TraceRowGroupView[] => {
  const ofKind = (kind: NodeBlockListKind): ListedBlock[] => rows.filter((row) => row.kind === kind)
  const calls = ofKind(EXTERNAL_CALL)
  const groups: TraceRowGroupView[] = [
    ...KINDS_BEFORE_CALLS.map((kind) => groupOf(BLOCK_LIST_LABELS[kind], idsOf(ofKind(kind)))),
    ...[...new Set(calls.map(labelOfRow))].map((label) => groupOf(label, idsOf(calls.filter((row) => labelOfRow(row) === label)))),
    groupOf(TRIGGERS_LABEL, triggers.map(({ codeBlock }) => codeBlock.id)),
    groupOf(BLOCK_LIST_LABELS[STEP], idsOf(ofKind(STEP))),
  ].filter(({ rowIds }) => rowIds.length > 0)
  return groups.length === 1 && groups[0].label === TRIGGERS_LABEL ? [{ ...groups[0], label: null }] : groups
}
