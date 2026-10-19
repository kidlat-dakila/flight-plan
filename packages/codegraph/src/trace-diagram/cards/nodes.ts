import type { CodeBlock, TraceNode } from "@flightplan/configurations"
import type { CardRules } from "./types"

export const NO_PARENTS: ReadonlyMap<string, string> = new Map()
export const NOTHING_LEFT_OUT: ReadonlySet<string> = new Set()

export const isNoNodeBlock = (): boolean => false

export const rootBlockOfNode = (node: TraceNode): CodeBlock => node.codeBlocks[0]

export const filePathOfNode = (node: TraceNode): string => rootBlockOfNode(node).astGraph.filePath

export const SAME_NODES: Omit<CardRules, "kind" | "isNodeBlock" | "listParents"> = {
  isNotNodeBlock: isNoNodeBlock,
  listLeftOutNodeIds: () => NOTHING_LEFT_OUT,
  groupNodes: () => [],
  listAddedEdges: () => [],
  listLeftOutEdgeIds: () => NOTHING_LEFT_OUT,
}
