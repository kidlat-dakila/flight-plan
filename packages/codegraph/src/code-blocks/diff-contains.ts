import type { StoredCodeBlock } from "./stored-types"
import type { CodeBlockType, DiffKind } from "./types"

const DIFF_KINDS: readonly DiffKind[] = ["ui", "state", "effect", "event", "route", "data", "auth", "type", "file", "logic"]

const KIND_BY_TYPE: ReadonlyMap<CodeBlockType, DiffKind> = new Map<CodeBlockType, DiffKind>([
  ["component", "ui"],
  ["render-root", "ui"],
  ["render", "ui"],
  ["render-condition", "ui"],
  ["render-loop", "ui"],
  ["render-event", "ui"],
  ["state", "state"],
  ["derived", "state"],
  ["effect", "effect"],
  ["component-effect", "effect"],
  ["effect-callback", "effect"],
  ["code-event", "event"],
  ["route", "route"],
  ["resolver", "route"],
  ["middleware", "route"],
  ["data", "data"],
  ["data-fetch", "data"],
  ["cache", "data"],
  ["transaction", "data"],
  ["auth", "auth"],
  ["type-declaration", "type"],
  ["file", "file"],
])

const CALLABLE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "component", "method"])
const RENDER_ROOT: CodeBlockType = "render-root"
const INTERFACE_KIND: DiffKind = "ui"
const OTHER_KIND: DiffKind = "logic"
const RUNNING_NOTHING: ReadonlySet<DiffKind> = new Set<DiffKind>(["type", "file"])

type BlockById = ReadonlyMap<string, StoredCodeBlock>

const withAncestors = (block: StoredCodeBlock, blockById: BlockById): StoredCodeBlock[] => {
  const parent = block.parentBlockId === null ? undefined : blockById.get(block.parentBlockId)
  return parent === undefined ? [block] : [block, ...withAncestors(parent, blockById)]
}

const componentIdOf = (renderRoot: StoredCodeBlock, blockById: BlockById): string[] => {
  const component = withAncestors(renderRoot, blockById).find((holder) => CALLABLE_TYPES.has(holder.type))
  return component === undefined ? [] : [component.id]
}

const kindsOf = (block: StoredCodeBlock, componentIds: ReadonlySet<string>, blockById: BlockById): DiffKind[] => {
  const ownKind = KIND_BY_TYPE.get(block.type)
  const isInComponent = withAncestors(block, blockById).some((holder) => componentIds.has(holder.id))
  const kinds = [...(isInComponent ? [INTERFACE_KIND] : []), ...(ownKind === undefined ? [] : [ownKind])]
  return kinds.length === 0 ? [OTHER_KIND] : kinds
}

export const readKindsOf = (codeBlocks: readonly StoredCodeBlock[], isCounted: (block: StoredCodeBlock) => boolean): DiffKind[] => {
  const blockById: BlockById = new Map(codeBlocks.map((block) => [block.id, block] as const))
  const renderRoots = codeBlocks.filter((block) => block.type === RENDER_ROOT)
  const componentIds = new Set(renderRoots.flatMap((renderRoot) => componentIdOf(renderRoot, blockById)))
  const found = new Set(codeBlocks.filter(isCounted).flatMap((block) => kindsOf(block, componentIds, blockById)))
  return DIFF_KINDS.filter((kind) => found.has(kind))
}

export const readDiffContains = (codeBlocks: readonly StoredCodeBlock[]): DiffKind[] =>
  readKindsOf(codeBlocks, (block) => block.lineOfCodeDiffs !== null)

export const readChainContains = (codeBlocks: readonly StoredCodeBlock[]): DiffKind[] =>
  readKindsOf(codeBlocks, (block) => block.diffSourceIds.length > 0)

export const hasRunningChange = (diffContains: readonly DiffKind[]): boolean => diffContains.some((kind) => !RUNNING_NOTHING.has(kind))
