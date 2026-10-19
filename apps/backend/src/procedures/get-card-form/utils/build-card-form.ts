import { waypointsOf } from "@/procedures/read-artifact/utils/artifact-walk"
import { listCardRows, nameOfBlock, nameOfCardRow } from "@flightplan/codegraph"
import type { TraceNode, ReviewArtifact, Segment } from "@flightplan/configurations"
import { DEFAULT_ROW_KIND, listRowKindOptions } from "./row-kinds"
import type { CardForm } from "./schemas"

const CORE_CHANGE_LABEL = "Core change"

const linesOf = ({ codeBlocks: [root] }: TraceNode): { readonly lineStart: number, readonly lineEnd: number } => {
  const ranges = root.lineOfCodeRangeReference
  return {
    lineStart: Math.min(...ranges.map((range) => range.start.line)),
    lineEnd: Math.max(...ranges.map((range) => range.end.line)),
  }
}

const waypointsIn = (artifact: ReviewArtifact, segment: Segment, path: string): CardForm["waypoints"] => {
  const declarations = new Map(Object.entries(artifact.sources.find((source) => source.path === path)?.declarations ?? {}))
  return waypointsOf(segment)
    .filter(({ file }) => file.path === path)
    .flatMap(({ waypoint }) => {
      const range = declarations.get(waypoint.declaration)
      return range === undefined
        ? []
        : [{
            id: waypoint.id,
            title: waypoint.title ?? waypoint.declaration,
            lineStart: range.lineStart,
            lineEnd: range.lineEnd,
            coreChangeLabel: waypoint.coreChange === null ? null : CORE_CHANGE_LABEL,
          }]
    })
}

export const buildCardForm = (artifact: ReviewArtifact, segment: Segment, node: TraceNode): CardForm => {
  const [root] = node.codeBlocks
  const name = nameOfBlock(root)
  const path = root.astGraph.filePath
  const rows = listCardRows(node)
  return {
    nodeId: node.id,
    title: `Modify ${name}`,
    path,
    ...linesOf(node),
    label: node.label ?? "",
    labelPlaceholder: name,
    description: node.description ?? "",
    rows: rows.map((row) => ({ ...row, label: row.label ?? "", name: nameOfCardRow(node, row) })),
    kindOptions: listRowKindOptions(rows.map((row) => row.type)),
    defaultKind: DEFAULT_ROW_KIND,
    waypoints: waypointsIn(artifact, segment, path),
  }
}
