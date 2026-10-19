import type { ASTCodeGroupGraph, BlockLabel, CodeBlock, CodeBlockType, ImportGraphGroup, TraceDiagram, TraceNode, TraceNodeEdge, TriggerLabel } from "@flightplan/configurations"

export interface StoredTriggerLabel {
  readonly label: string | null
  readonly codeBlockId: string
}

export interface StoredBlockLabel {
  readonly label: string | null
  readonly codeBlockId: string
}

export interface StoredTraceNode {
  readonly id: string
  readonly type: CodeBlockType
  readonly label: string | null
  readonly description: string | null
  readonly codeBlockIds: readonly string[]
  readonly diffCodeBlockIds: readonly string[]
  readonly children: readonly StoredTraceNode[]
  readonly triggerLabels: readonly StoredTriggerLabel[]
  readonly blockLabels: readonly StoredBlockLabel[]
}

export interface StoredTraceDiagram {
  readonly description: string | null
  readonly traceNodes: readonly StoredTraceNode[]
  readonly traceNodeEdges: readonly TraceNodeEdge[]
}

export interface FlatTraceNode {
  readonly id: string
  readonly parentId: string | null
  readonly type: CodeBlockType
  readonly label: string | null
  readonly description: string | null
  readonly codeBlockIds: readonly string[]
  readonly diffCodeBlockIds: readonly string[]
  readonly triggerLabels: readonly StoredTriggerLabel[]
  readonly blockLabels: readonly StoredBlockLabel[]
  readonly isRequired: boolean
}

const idsOf = (blocks: readonly CodeBlock[]): string[] => blocks.map((block) => block.id)

const storeTriggerLabel = ({ label, codeBlock }: TriggerLabel): StoredTriggerLabel => ({ label, codeBlockId: codeBlock.id })

const storeBlockLabel = ({ label, codeBlock }: BlockLabel): StoredBlockLabel => ({ label, codeBlockId: codeBlock.id })

const storeNode = ({ id, type, label, description, codeBlocks, diffCodeBlocks, children, triggerLabels, blockLabels }: TraceNode): StoredTraceNode => ({
  id,
  type,
  label,
  description,
  codeBlockIds: idsOf(codeBlocks),
  diffCodeBlockIds: idsOf(diffCodeBlocks),
  children: children.map(storeNode),
  triggerLabels: triggerLabels.map(storeTriggerLabel),
  blockLabels: blockLabels.map(storeBlockLabel),
})

export const storeTraceDiagram = ({ description, traceNodes, traceNodeEdges }: TraceDiagram): StoredTraceDiagram => ({
  description,
  traceNodes: traceNodes.map(storeNode),
  traceNodeEdges,
})

const found = (blockById: ReadonlyMap<string, CodeBlock>, blockId: string): CodeBlock => {
  const block = blockById.get(blockId)
  if (block === undefined) throw new Error(`The group holds no block ${blockId}.`)
  return block
}

const linkNode = (stored: StoredTraceNode, blockById: ReadonlyMap<string, CodeBlock>): TraceNode => ({
  id: stored.id,
  type: stored.type,
  label: stored.label,
  description: stored.description,
  codeBlocks: stored.codeBlockIds.map((blockId) => found(blockById, blockId)),
  diffCodeBlocks: stored.diffCodeBlockIds.map((blockId) => found(blockById, blockId)),
  children: stored.children.map((child) => linkNode(child, blockById)),
  triggerLabels: stored.triggerLabels.map((trigger) => ({ label: trigger.label, codeBlock: found(blockById, trigger.codeBlockId) })),
  blockLabels: stored.blockLabels.map((listed) => ({ label: listed.label, codeBlock: found(blockById, listed.codeBlockId) })),
  isRequired: false,
})

export const linkTraceDiagram = (stored: StoredTraceDiagram, astCodeGroup: ASTCodeGroupGraph, importGraphGroup: ImportGraphGroup): TraceDiagram => {
  const blockById = new Map(astCodeGroup.codeBlocks.map((block) => [block.id, block] as const))
  return {
    astCodeGroup,
    importGraphGroup,
    description: stored.description,
    traceNodes: stored.traceNodes.map((node) => linkNode(node, blockById)),
    traceNodeEdges: stored.traceNodeEdges,
    isRequired: false,
  }
}

const toFlatNode = ({ id, type, label, description, codeBlocks, diffCodeBlocks, triggerLabels, blockLabels, isRequired }: TraceNode, parentId: string | null): FlatTraceNode => ({
  id,
  parentId,
  type,
  label,
  description,
  codeBlockIds: idsOf(codeBlocks),
  diffCodeBlockIds: idsOf(diffCodeBlocks),
  triggerLabels: triggerLabels.map(storeTriggerLabel),
  blockLabels: blockLabels.map(storeBlockLabel),
  isRequired,
})

const flattenNode = (node: TraceNode, parentId: string | null): FlatTraceNode[] => [
  toFlatNode(node, parentId),
  ...node.children.flatMap((child) => flattenNode(child, node.id)),
]

export const flattenTraceNodes = (nodes: readonly TraceNode[]): FlatTraceNode[] => nodes.flatMap((node) => flattenNode(node, null))
