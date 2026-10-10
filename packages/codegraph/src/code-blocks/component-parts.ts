import type { JourneyFlow, TracedEvent, TracedName } from "@flightplan/configurations"
import { compareRanges } from "./source-range"
import type { StoredCodeBlock, StoredCodeBlockSymbol, StoredCodeGroupGraph } from "./stored-types"
import type { CodeBlockType } from "./types"

export interface ComponentParts {
  readonly states: readonly TracedName[]
  readonly dataFetches: readonly TracedEvent[]
  readonly hooks: readonly TracedName[]
  readonly effects: readonly TracedEvent[]
}

export type FindComponentParts = (filePath: string, declaration: string) => ComponentParts

interface PartIndex {
  readonly codeBlocks: readonly StoredCodeBlock[]
  readonly blockById: ReadonlyMap<string, StoredCodeBlock>
}

type PartKind = "data-fetch" | "hook" | "effect"

interface Candidate {
  readonly block: StoredCodeBlock
  readonly name: string
  readonly kind: PartKind | null
}

const CALLABLE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "method"])
const STATE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["state", "derived"])
const VALUE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["external-value", "root-variable", "state", "derived"])
const WRITTEN_IN_PLACE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "method", "effect-callback", "code-event"])
const KEPT_RESULT: CodeBlockType = "external-value"
const EFFECT: CodeBlockType = "component-effect"
const DATA_FETCH: CodeBlockType = "data-fetch"
const RENDER_ROOT: CodeBlockType = "render-root"
const HOOK_NAME_PATTERN = /^use[A-Z]/
const UNNAMED_EFFECT = "effect"

export const NO_COMPONENT_PARTS: ComponentParts = { states: [], dataFetches: [], hooks: [], effects: [] }

const blocksOf = (blockIds: readonly string[], { blockById }: PartIndex): StoredCodeBlock[] =>
  blockIds.flatMap((blockId) => {
    const block = blockById.get(blockId)
    return block === undefined ? [] : [block]
  })

const parentOf = (block: StoredCodeBlock, { blockById }: PartIndex): StoredCodeBlock | null =>
  block.parentBlockId === null ? null : (blockById.get(block.parentBlockId) ?? null)

const isWithin = (block: StoredCodeBlock, holder: StoredCodeBlock, index: PartIndex): boolean => {
  const parent = parentOf(block, index)
  return parent !== null && (parent.id === holder.id || isWithin(parent, holder, index))
}

const heldBy = (block: StoredCodeBlock, index: PartIndex): StoredCodeBlock[] => [
  block,
  ...blocksOf(block.childrenBlockIds, index).flatMap((child) => heldBy(child, index)),
]

const callableAround = (block: StoredCodeBlock, index: PartIndex): StoredCodeBlock | null => {
  const parent = parentOf(block, index)
  if (parent === null || CALLABLE_TYPES.has(parent.type)) return parent
  return callableAround(parent, index)
}

const componentOf = (root: StoredCodeBlock, index: PartIndex): StoredCodeBlock | null => {
  const renderRoot = index.codeBlocks.find((block) => block.type === RENDER_ROOT && isWithin(block, root, index))
  return renderRoot === undefined ? null : callableAround(renderRoot, index)
}

const lastOf = (path: readonly string[]): string | null => (path.length === 0 ? null : path[path.length - 1])

const calledNameOf = (symbol: StoredCodeBlockSymbol, { blockById }: PartIndex): string | null => {
  const member = lastOf(symbol.member?.path ?? [])
  if (member !== null) return member
  if (symbol.type === "unopened-import") return symbol.importedName
  return symbol.type === "internal-code-block" || symbol.type === "external-block" ? (blockById.get(symbol.codeBlockId)?.name ?? null) : null
}

const listCalledNames = (block: StoredCodeBlock, index: PartIndex): string[] =>
  [...block.outerSymbols]
    .filter((symbol) => symbol.use === "call")
    .sort((one, two) => compareRanges(one.usedAt, two.usedAt))
    .flatMap((symbol) => {
      const name = calledNameOf(symbol, index)
      return name === null ? [] : [name]
    })

const listCalls = (kept: StoredCodeBlock, index: PartIndex): StoredCodeBlock[] =>
  blocksOf(kept.childrenBlockIds, index).filter((child) => !WRITTEN_IN_PLACE_TYPES.has(child.type))

const listKeptNames = (kept: StoredCodeBlock, index: PartIndex): string[] =>
  [kept, ...listCalls(kept, index)].flatMap((block) => listCalledNames(block, index))

const reach = (pending: readonly StoredCodeBlock[], index: PartIndex, reachedIds: ReadonlySet<string> = new Set()): ReadonlySet<string> => {
  const unvisited = pending.filter((block) => !reachedIds.has(block.id))
  if (unvisited.length === 0) return reachedIds
  const stepped = unvisited.flatMap((block) => heldBy(block, index))
  const steppedIds = new Set([...reachedIds, ...stepped.map((block) => block.id)])
  return reach(stepped.flatMap((block) => blocksOf(block.nextBlockIds, index)), index, steppedIds)
}

const isFetching = (block: StoredCodeBlock, index: PartIndex): boolean =>
  blocksOf([...reach([block], index)], index).some((reached) => reached.type === DATA_FETCH)

const partOf = (block: StoredCodeBlock, name: string, index: PartIndex): TracedName[] => {
  const held = heldBy(block, index)
  const [{ start, end }] = block.lineOfCodeRangeReference
  const reference: TracedName["reference"] = [start.line, end.line]
  if (held.some((inner) => inner.lineOfCodeDiffs !== null)) return [{ name, changeType: "diff", reference }]
  return held.some((inner) => inner.diffSourceIds.length > 0) ? [{ name, changeType: "related", reference }] : []
}

const isKept = (call: StoredCodeBlock, index: PartIndex): boolean => {
  const parent = parentOf(call, index)
  return parent !== null && VALUE_TYPES.has(parent.type)
}

const toKeptCandidate = (kept: StoredCodeBlock, index: PartIndex): Candidate[] => {
  const names = listKeptNames(kept, index)
  const hookName = names.find((name) => HOOK_NAME_PATTERN.test(name))
  if (hookName !== undefined) return [{ block: kept, name: hookName, kind: "hook" }]
  return names.length === 0 ? [] : [{ block: kept, name: names[0], kind: null }]
}

const toCandidates = (block: StoredCodeBlock, index: PartIndex): Candidate[] => {
  if (block.type === KEPT_RESULT) return toKeptCandidate(block, index)
  if (isKept(block, index)) return []
  if (block.type === EFFECT) return [{ block, name: [...listCalledNames(block, index), UNNAMED_EFFECT][0], kind: "effect" }]
  return block.type === DATA_FETCH ? [{ block, name: [...listCalledNames(block, index), DATA_FETCH][0], kind: "data-fetch" }] : []
}

const numbered = (candidates: readonly Candidate[]): Candidate[] =>
  candidates.map((candidate, position) => {
    const sameName = candidates.filter((other) => other.name === candidate.name)
    if (sameName.length === 1) return candidate
    const earlierCount = candidates.slice(0, position).filter((other) => other.name === candidate.name).length
    return { ...candidate, name: `${candidate.name} (${String(earlierCount + 1)})` }
  })

const unlinked = (part: TracedName): TracedEvent => ({ ...part, nodeId: null })

const kindOf = ({ block, kind }: Candidate, index: PartIndex): PartKind | null => (isFetching(block, index) ? "data-fetch" : kind)

const partsOf = (component: StoredCodeBlock, index: PartIndex): ComponentParts => {
  const body = index.codeBlocks.filter((block) => callableAround(block, index)?.id === component.id)
  const candidates = numbered(body.flatMap((block) => toCandidates(block, index))).map((candidate) => ({ ...candidate, kind: kindOf(candidate, index) }))
  const listOf = (kind: PartKind): TracedName[] =>
    candidates.filter((candidate) => candidate.kind === kind).flatMap(({ block, name }) => partOf(block, name, index))
  return {
    states: body.filter((block) => STATE_TYPES.has(block.type)).flatMap((block) => partOf(block, block.name ?? block.type, index)),
    dataFetches: listOf("data-fetch").map(unlinked),
    hooks: listOf("hook"),
    effects: listOf("effect").map(unlinked),
  }
}

export const createComponentPartsFinder = (groups: readonly StoredCodeGroupGraph[]): FindComponentParts => {
  const codeBlocks = groups.flatMap((group) => group.codeBlocks)
  const index: PartIndex = { codeBlocks, blockById: new Map(codeBlocks.map((block) => [block.id, block] as const)) }
  return (filePath, declaration) => {
    const root = codeBlocks.find((block) => block.isRoot && block.filePath === filePath && block.name === declaration)
    const component = root === undefined ? null : componentOf(root, index)
    return component === null ? NO_COMPONENT_PARTS : partsOf(component, index)
  }
}

const COMPONENT_CATEGORY = "ui"

export const withComponentParts = (flow: JourneyFlow, findComponentParts: FindComponentParts): JourneyFlow => ({
  ...flow,
  nodes: flow.nodes.map((node) =>
    node.kind === "declaration" && node.category === COMPONENT_CATEGORY ? { ...node, ...findComponentParts(node.path, node.declaration) } : node,
  ),
})
