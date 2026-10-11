import type { ASTCodeGroupGraph, CodeBlock, CodeBlockType, ImportGraphGroup, JourneyFlowDiagram, JourneyNode, JourneyNodeEdge, TriggerLabel } from "@flightplan/configurations"

export interface StoredTriggerLabel {
  readonly label: string | null
  readonly codeBlockId: string
}

export interface StoredJourneyNode {
  readonly id: string
  readonly type: CodeBlockType
  readonly label: string | null
  readonly description: string | null
  readonly codeBlockIds: readonly string[]
  readonly diffCodeBlockIds: readonly string[]
  readonly children: readonly StoredJourneyNode[]
  readonly triggerLabels: readonly StoredTriggerLabel[]
}

export interface StoredJourneyFlowDiagram {
  readonly journeyNodes: readonly StoredJourneyNode[]
  readonly journeyNodeEdges: readonly JourneyNodeEdge[]
}

export interface FlatJourneyNode {
  readonly id: string
  readonly parentId: string | null
  readonly type: CodeBlockType
  readonly label: string | null
  readonly description: string | null
  readonly codeBlockIds: readonly string[]
  readonly diffCodeBlockIds: readonly string[]
  readonly triggerLabels: readonly StoredTriggerLabel[]
}

const idsOf = (blocks: readonly CodeBlock[]): string[] => blocks.map((block) => block.id)

const storeTriggerLabel = ({ label, codeBlock }: TriggerLabel): StoredTriggerLabel => ({ label, codeBlockId: codeBlock.id })

const storeNode = ({ id, type, label, description, codeBlocks, diffCodeBlocks, children, triggerLabels }: JourneyNode): StoredJourneyNode => ({
  id,
  type,
  label,
  description,
  codeBlockIds: idsOf(codeBlocks),
  diffCodeBlockIds: idsOf(diffCodeBlocks),
  children: children.map(storeNode),
  triggerLabels: triggerLabels.map(storeTriggerLabel),
})

export const storeJourneyFlowDiagram = ({ journeyNodes, journeyNodeEdges }: JourneyFlowDiagram): StoredJourneyFlowDiagram => ({
  journeyNodes: journeyNodes.map(storeNode),
  journeyNodeEdges,
})

const found = (blockById: ReadonlyMap<string, CodeBlock>, blockId: string): CodeBlock => {
  const block = blockById.get(blockId)
  if (block === undefined) throw new Error(`The group holds no block ${blockId}.`)
  return block
}

const linkNode = (stored: StoredJourneyNode, blockById: ReadonlyMap<string, CodeBlock>): JourneyNode => ({
  id: stored.id,
  type: stored.type,
  label: stored.label,
  description: stored.description,
  codeBlocks: stored.codeBlockIds.map((blockId) => found(blockById, blockId)),
  diffCodeBlocks: stored.diffCodeBlockIds.map((blockId) => found(blockById, blockId)),
  children: stored.children.map((child) => linkNode(child, blockById)),
  triggerLabels: stored.triggerLabels.map((trigger) => ({ label: trigger.label, codeBlock: found(blockById, trigger.codeBlockId) })),
})

export const linkJourneyFlowDiagram = (stored: StoredJourneyFlowDiagram, astCodeGroup: ASTCodeGroupGraph, importGraphGroup: ImportGraphGroup): JourneyFlowDiagram => {
  const blockById = new Map(astCodeGroup.codeBlocks.map((block) => [block.id, block] as const))
  return {
    astCodeGroup,
    importGraphGroup,
    journeyNodes: stored.journeyNodes.map((node) => linkNode(node, blockById)),
    journeyNodeEdges: stored.journeyNodeEdges,
  }
}

const toFlatNode = ({ id, type, label, description, codeBlocks, diffCodeBlocks, triggerLabels }: JourneyNode, parentId: string | null): FlatJourneyNode => ({
  id,
  parentId,
  type,
  label,
  description,
  codeBlockIds: idsOf(codeBlocks),
  diffCodeBlockIds: idsOf(diffCodeBlocks),
  triggerLabels: triggerLabels.map(storeTriggerLabel),
})

const flattenNode = (node: JourneyNode, parentId: string | null): FlatJourneyNode[] => [
  toFlatNode(node, parentId),
  ...node.children.flatMap((child) => flattenNode(child, node.id)),
]

export const flattenJourneyNodes = (nodes: readonly JourneyNode[]): FlatJourneyNode[] => nodes.flatMap((node) => flattenNode(node, null))
