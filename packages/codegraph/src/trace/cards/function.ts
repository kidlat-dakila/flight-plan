import type { ListedBlock } from "@/trace-diagram/listed-blocks"
import type { CodeBlock, TraceRowGroupView, TriggerLabel } from "@flightplan/configurations"
import { ARGUMENT, idsOf } from "./labels"

const positionOf = (block: CodeBlock): readonly [number, number] => {
  const { line, column } = block.lineOfCodeRangeReference[0].start
  return [line, column]
}

const inWrittenOrder = (blocks: readonly CodeBlock[]): CodeBlock[] =>
  [...blocks].sort((one, two) => positionOf(one)[0] - positionOf(two)[0] || positionOf(one)[1] - positionOf(two)[1])

export const listRowsInOrder = (rows: readonly ListedBlock[], triggers: readonly TriggerLabel[]): TraceRowGroupView[] => {
  const isArgument = (row: ListedBlock): boolean => row.kind === ARGUMENT
  const following = inWrittenOrder([...rows.filter((row) => !isArgument(row)).map(({ block }) => block), ...triggers.map(({ codeBlock }) => codeBlock)])
  const rowIds = [...idsOf(rows.filter(isArgument)), ...following.map((block) => block.id)]
  return rowIds.length === 0 ? [] : [{ label: null, rowIds, childIds: [] }]
}
