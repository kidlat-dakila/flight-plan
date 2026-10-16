import type { ListedBlock } from "@/journey-flow-diagram/listed-blocks"
import type { CodeBlockType, JourneyNode, JourneyRowGroupView, TriggerLabel } from "@flightplan/configurations"
import { listRowsInOrder } from "./function"
import { BLOCK_LIST_LABELS, idsOf, PROPERTY } from "./labels"

const METHOD: CodeBlockType = "method"
const METHODS_LABEL = "Methods"

export const listClassGroups = (node: JourneyNode, rows: readonly ListedBlock[], triggers: readonly TriggerLabel[]): JourneyRowGroupView[] => {
  const properties = rows.filter((row) => row.kind === PROPERTY)
  const methodIds = node.children.filter((child) => child.type === METHOD).map((child) => child.id)
  return [
    ...listRowsInOrder(rows.filter((row) => row.kind !== PROPERTY), triggers),
    { label: BLOCK_LIST_LABELS[PROPERTY], rowIds: idsOf(properties), childIds: [] },
    { label: METHODS_LABEL, rowIds: [], childIds: methodIds },
  ].filter(({ rowIds, childIds }) => rowIds.length > 0 || childIds.length > 0)
}
