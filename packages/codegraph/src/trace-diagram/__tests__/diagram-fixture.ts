import { groupOf, sourcesOf, type FixtureDiffs, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import { linkCodeGroupGraph } from "@/code-blocks/link-group"
import { generateTraceDiagram, type TraceScope } from "@/trace-diagram"
import type { ImportGraphGroup, TraceDiagram, TraceNode } from "@flightplan/configurations"

const HEAD_COMMIT = "head"
const INDENT = "  "

export const importGraphGroupOf = (files: FixtureFiles): ImportGraphGroup =>
  sourcesOf(files).map(({ filePath, importedBy, importedFilePaths }) => ({
    filePath,
    gitSha: HEAD_COMMIT,
    diffType: null,
    importedBy,
    importsTo: [...importedFilePaths.values()],
    importedFilePaths,
  }))

export const diagramOf = (files: FixtureFiles, diffs: FixtureDiffs, scope: TraceScope | null = null): TraceDiagram | null =>
  generateTraceDiagram({ group: linkCodeGroupGraph(groupOf(files, diffs)), importGraphGroup: importGraphGroupOf(files), scope })

export const presentDiagramOf = (files: FixtureFiles, diffs: FixtureDiffs): TraceDiagram => {
  const diagram = diagramOf(files, diffs)
  if (diagram === null) throw new Error("The fixture has no diagram.")
  return diagram
}

const lineOf = ({ type, codeBlocks: [root], diffCodeBlocks }: TraceNode, depth: number): string =>
  `${INDENT.repeat(depth)}${type} ${root.name ?? ""}${diffCodeBlocks.length > 0 ? " (changed)" : ""}`.trimEnd()

const outlineBelow = (nodes: readonly TraceNode[], depth: number): string[] =>
  nodes.flatMap((node) => [lineOf(node, depth), ...outlineBelow(node.children, depth + 1)])

export const outlineOfNodes = (diagram: TraceDiagram | null): string[] => outlineBelow(diagram?.traceNodes ?? [], 0)
