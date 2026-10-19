import type { StoredCodeBlock } from "./stored-types"
import type { CodeBlockClassification, CodeBlockType, DiffKind } from "./types"

const DIFF_KINDS: readonly DiffKind[] = ["ui", "state", "effect", "event", "route", "data", "auth", "type", "file", "logic"]

const KIND_BY_CLASSIFICATION: ReadonlyMap<CodeBlockClassification, DiffKind> = new Map<CodeBlockClassification, DiffKind>([
  ["page", "ui"],
  ["component", "ui"],
  ["api-route", "route"],
  ["webhook", "route"],
  ["server-action", "route"],
  ["database-operation", "data"],
  ["state", "state"],
  ["store", "state"],
  ["effect", "effect"],
  ["event", "event"],
  ["auth", "auth"],
  ["type", "type"],
  ["file", "file"],
])

const CALLABLE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "component", "method"])
const RENDER_ROOT: CodeBlockType = "render-root"
const INTERFACE_KIND: DiffKind = "ui"
const OTHER_KIND: DiffKind = "logic"
const RUNNING_NOTHING: ReadonlySet<DiffKind> = new Set<DiffKind>(["type", "file"])

type BlockById = ReadonlyMap<string, StoredCodeBlock>

export type OwnClassificationsOf = (block: StoredCodeBlock) => readonly CodeBlockClassification[]

export const diffKindOf = (classification: CodeBlockClassification): DiffKind => KIND_BY_CLASSIFICATION.get(classification) ?? OTHER_KIND

export const diffKindsOf = (classifications: readonly CodeBlockClassification[]): DiffKind[] => {
  const found = new Set(classifications.map(diffKindOf))
  return DIFF_KINDS.filter((kind) => found.has(kind))
}

const withAncestors = (block: StoredCodeBlock, blockById: BlockById): StoredCodeBlock[] => {
  const parent = block.parentBlockId === null ? undefined : blockById.get(block.parentBlockId)
  return parent === undefined ? [block] : [block, ...withAncestors(parent, blockById)]
}

const componentIdOf = (renderRoot: StoredCodeBlock, blockById: BlockById): string[] => {
  const component = withAncestors(renderRoot, blockById).find((holder) => CALLABLE_TYPES.has(holder.type))
  return component === undefined ? [] : [component.id]
}

interface KindReading {
  readonly componentIds: ReadonlySet<string>
  readonly blockById: BlockById
  readonly ownClassificationsOf: OwnClassificationsOf
}

const kindsOf = (block: StoredCodeBlock, { componentIds, blockById, ownClassificationsOf }: KindReading): DiffKind[] => {
  const isInComponent = withAncestors(block, blockById).some((holder) => componentIds.has(holder.id))
  const kinds = [...(isInComponent ? [INTERFACE_KIND] : []), ...ownClassificationsOf(block).map(diffKindOf)]
  return kinds.length === 0 ? [OTHER_KIND] : kinds
}

export const readKindsOf = (codeBlocks: readonly StoredCodeBlock[], isCounted: (block: StoredCodeBlock) => boolean, ownClassificationsOf: OwnClassificationsOf): DiffKind[] => {
  const blockById: BlockById = new Map(codeBlocks.map((block) => [block.id, block] as const))
  const renderRoots = codeBlocks.filter((block) => block.type === RENDER_ROOT)
  const componentIds = new Set(renderRoots.flatMap((renderRoot) => componentIdOf(renderRoot, blockById)))
  const found = new Set(codeBlocks.filter(isCounted).flatMap((block) => kindsOf(block, { componentIds, blockById, ownClassificationsOf })))
  return DIFF_KINDS.filter((kind) => found.has(kind))
}

export const readDiffContains = (codeBlocks: readonly StoredCodeBlock[], ownClassificationsOf: OwnClassificationsOf): DiffKind[] =>
  readKindsOf(codeBlocks, (block) => block.lineOfCodeDiffs !== null, ownClassificationsOf)

export const readChainContains = (codeBlocks: readonly StoredCodeBlock[], ownClassificationsOf: OwnClassificationsOf): DiffKind[] =>
  readKindsOf(codeBlocks, (block) => block.diffSourceIds.length > 0, ownClassificationsOf)

export const hasRunningChange = (diffContains: readonly DiffKind[]): boolean => diffContains.some((kind) => !RUNNING_NOTHING.has(kind))
