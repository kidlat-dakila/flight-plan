import type { ArgumentSite, AttributeSite, ASTGraphFile, FilesByPath, SourceRange } from "@/ast-graph"
import { isSameRange } from "@/ast-graph/source-range"
import { FIRST_COLUMN } from "@/code-blocks/source-range"
import type { StoredCodeBlock, StoredCodeBlockSymbol, StoredCodeGroupGraph } from "@/code-blocks/stored-types"
import type { CatalogueRuns, CodeBlockType, SourceRange as BlockRange } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"
import type { ConnectionCertainty, ConnectionKind } from "@flightplan/configurations"
import {
  apiCallOf,
  APP_START,
  boundaryOf,
  commandOf,
  effectOf,
  entryOfUnused,
  EVENT_BUS_BOUNDARY,
  listenedEventOf,
  PAGE_VISIT,
  pageVisitOf,
  UNUSED,
  userActionOf,
  type EntryPoint,
} from "./entry-points"
import { codeSiteIdOf, type CodeSite, type EdgeFact, type EntryEnd, type EntryFact, type JourneyFact } from "./facts"
import { isListener, listenerTargetOf } from "./listeners"

export interface ChainFacts {
  readonly facts: readonly JourneyFact[]
  readonly changedSites: readonly CodeSite[]
}

interface FactIndex {
  readonly blockById: ReadonlyMap<string, StoredCodeBlock>
  readonly files: FilesByPath
}

interface Kept {
  readonly usedAt: SourceRange
  readonly keptAt: SourceRange
}

interface Walk {
  readonly block: StoredCodeBlock
  readonly home: CodeSite | null
  readonly entry: PendingEntry | null
  readonly kept: Kept | null
  readonly lastUse: SourceRange | null
  readonly through: readonly string[]
  readonly handedAt: SourceRange | null
}

interface PendingEntry {
  readonly entry: EntryPoint
  readonly end: EntryEnd | null
}

interface Step {
  readonly next: StoredCodeBlock
  readonly usedAt: SourceRange | null
  readonly use: StoredCodeBlockSymbol["use"] | null
  readonly isAssumed: boolean
  readonly handedAt: SourceRange | null
  readonly hop: string | null
}

interface HandedSymbol {
  readonly holder: StoredCodeBlock
  readonly symbol: StoredCodeBlockSymbol
}

interface Walked {
  readonly facts: readonly JourneyFact[]
  readonly visited: ReadonlySet<string>
}

type Types = ReadonlySet<CodeBlockType>

const ARGUMENT: CodeBlockType = "root-argument-value"
const RENDER_EVENT: CodeBlockType = "render-event"
const CODE_EVENT: CodeBlockType = "code-event"
const COMPONENT_EFFECT: CodeBlockType = "component-effect"
const ROOT_STATEMENT: CodeBlockType = "root-statement"
const RENDER_ROOT: CodeBlockType = "render-root"
const VALUE_TYPES: Types = new Set<CodeBlockType>(["external-value", "root-variable", "state", "derived"])
const HANDED_TYPES: Types = new Set<CodeBlockType>(["effect", "component-effect", "code-event"])
const CALLBACK_TYPES: Types = new Set<CodeBlockType>(["effect-callback", "code-event"])
const NAME_PATTERN = /^[A-Za-z_$][\w$]*/
const CALLABLE_TYPES: Types = new Set<CodeBlockType>(["function", "hook", "method"])
const RUNS_BY_TYPE: ReadonlyMap<CodeBlockType, CatalogueRuns> = new Map<CodeBlockType, CatalogueRuns>([
  ["route", "route"],
  ["resolver", "resolver"],
  ["middleware", "middleware"],
])
const REQUEST_RUNS: ReadonlySet<CatalogueRuns> = new Set<CatalogueRuns>(["route", "resolver", "middleware"])
const COMMAND_RUNS: ReadonlySet<CatalogueRuns> = new Set<CatalogueRuns>(["job", "command"])
const PAGE_RUNS: CatalogueRuns = "page"
const MEMBER_SEPARATOR = "."
const KEY_SEPARATOR = "|"
const EVERY_REQUEST_LABEL = "Any request"
const UNNAMED_EFFECT = "An effect"
const UNNAMED_CALLBACK = "a callback"

const toSyntaxRange = ({ start, end }: BlockRange): SourceRange => ({
  start: { line: start.line, column: start.column - FIRST_COLUMN },
  end: { line: end.line, column: end.column - FIRST_COLUMN },
})

const rangeOfBlock = (block: StoredCodeBlock): SourceRange => toSyntaxRange(block.lineOfCodeRangeReference[0])

const parentOf = (block: StoredCodeBlock, { blockById }: FactIndex): StoredCodeBlock | null =>
  block.parentBlockId === null ? null : (blockById.get(block.parentBlockId) ?? null)

const rootOf = (block: StoredCodeBlock, index: FactIndex): StoredCodeBlock => {
  const parent = parentOf(block, index)
  return parent === null ? block : rootOf(parent, index)
}

const blocksOf = (blockIds: readonly string[], { blockById }: FactIndex): StoredCodeBlock[] =>
  blockIds.flatMap((blockId) => {
    const block = blockById.get(blockId)
    return block === undefined ? [] : [block]
  })

const heldBy = (block: StoredCodeBlock, index: FactIndex): StoredCodeBlock[] => [
  block,
  ...blocksOf(block.childrenBlockIds, index).flatMap((child) => heldBy(child, index)),
]

const isComponentBlock = (root: StoredCodeBlock, index: FactIndex): boolean => heldBy(root, index).some((held) => held.type === RENDER_ROOT)

const siteOf = (block: StoredCodeBlock, index: FactIndex): CodeSite | null => {
  const root = rootOf(block, index)
  const file = index.files.get(root.filePath)
  if (file === undefined) return null
  if (root.type === ROOT_STATEMENT) return { file, root: null }
  const { start, end } = root.lineOfCodeRangeReference[0]
  const encapsulation = file.findRootEncapsulation([start.line, end.line])
  const isNamedByBlock = encapsulation !== null && root.name !== undefined && root.name !== encapsulation.name
  return isNamedByBlock ? { file, root: encapsulation, name: root.name, isComponent: isComponentBlock(root, index) } : { file, root: encapsulation }
}

const referencedIdOf = (symbol: StoredCodeBlockSymbol): string | null => {
  if (symbol.member !== undefined && symbol.member.blockId !== null) return symbol.member.blockId
  return symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockId : null
}

const nameRangeAt = (used: SourceRange, file: ASTGraphFile | undefined): SourceRange => {
  const name = file === undefined ? null : NAME_PATTERN.exec(file.readLine(used.start.line).slice(used.start.column))
  return name === null ? used : { start: used.start, end: { line: used.start.line, column: used.start.column + name[0].length } }
}

const stepThroughSymbol = (block: StoredCodeBlock, next: StoredCodeBlock, { files }: FactIndex): Step | null => {
  const symbol = block.outerSymbols.find((candidate) => referencedIdOf(candidate) === next.id)
  if (symbol === undefined) return null
  const isAssumed = symbol.member !== undefined && symbol.member.blockId !== null
  return { next, usedAt: nameRangeAt(toSyntaxRange(symbol.usedAt), files.get(block.filePath)), use: symbol.use, isAssumed, handedAt: null, hop: null }
}

const listHandedTo = (argument: StoredCodeBlock, index: FactIndex): HandedSymbol[] =>
  argument.handedFrom.flatMap(({ blockId, symbolIndex }) => blocksOf([blockId], index).map((holder) => ({ holder, symbol: holder.outerSymbols[symbolIndex] })))

const eventListenedAt = ({ holder, symbol }: HandedSymbol, { files }: FactIndex): string | null => {
  const sites = files.get(holder.filePath)?.listSyntaxSitesAt(toSyntaxRange(symbol.usedAt)) ?? []
  return sites.flatMap((site) => (site.kind === "attribute" && site.event !== undefined ? [site.event] : []))[0] ?? null
}

const handedNameOf = (argument: StoredCodeBlock, index: FactIndex): string =>
  listHandedTo(argument, index).map((handed) => eventListenedAt(handed, index)).find((event) => event !== null) ?? argument.name ?? ""

const stepThroughHanding = (argument: StoredCodeBlock, next: StoredCodeBlock, index: FactIndex): Step | null => {
  const handed = listHandedTo(argument, index).find(({ symbol }) => referencedIdOf(symbol) === next.id)
  if (handed === undefined) return null
  const hop = next.type === ARGUMENT ? [rootOf(next, index).name ?? "", handedNameOf(next, index)].join(MEMBER_SEPARATOR) : null
  return { next, usedAt: null, use: handed.symbol.use, isAssumed: false, handedAt: toSyntaxRange(handed.symbol.usedAt), hop }
}

const stepTo = (block: StoredCodeBlock, next: StoredCodeBlock, index: FactIndex): Step =>
  (block.type === ARGUMENT ? stepThroughHanding(block, next, index) : stepThroughSymbol(block, next, index))
  ?? { next, usedAt: null, use: null, isAssumed: false, handedAt: null, hop: null }

const handedCallOf = (declaration: StoredCodeBlock, index: FactIndex): StoredCodeBlock | null =>
  VALUE_TYPES.has(declaration.type) ? (blocksOf(declaration.childrenBlockIds, index).find((child) => HANDED_TYPES.has(child.type)) ?? null) : null

const isSameSite = (one: CodeSite, two: CodeSite): boolean => codeSiteIdOf(one) === codeSiteIdOf(two)

const connectionOf = ({ use, isAssumed, handedAt }: Step, kept: Kept | null, through: readonly string[]): ConnectionKind =>
  kept !== null || isAssumed || handedAt !== null || through.length > 0 || use === "value" || use === "read" ? "value" : "call"

const certaintyOf = ({ isAssumed }: Step, kept: Kept | null): ConnectionCertainty => (kept !== null || isAssumed ? "assumed" : "proven")

const edgeFrom = (walk: Walk, home: CodeSite, to: CodeSite, step: Step): EdgeFact => {
  const usedAt = walk.kept?.usedAt ?? step.usedAt ?? walk.lastUse ?? rangeOfBlock(walk.block)
  const isLanding = step.next.parentBlockId !== null
  return {
    kind: "edge",
    from: home,
    to,
    connection: connectionOf(step, walk.kept, walk.through),
    certainty: certaintyOf(step, walk.kept),
    through: walk.through,
    usedAt,
    keptAt: walk.kept?.keptAt ?? null,
    handedAt: isLanding ? (step.handedAt ?? walk.handedAt) : null,
    isRender: step.use === "render",
  }
}

const startKeyOf = (range: SourceRange | null): string => (range === null ? "" : [range.start.line, range.start.column].join(":"))

const walkKeyOf = ({ block, home, kept, lastUse, through, handedAt, entry }: Walk): string =>
  [
    block.id,
    home === null ? "" : codeSiteIdOf(home),
    startKeyOf(kept?.usedAt ?? null),
    startKeyOf(lastUse),
    through.join(MEMBER_SEPARATOR),
    startKeyOf(handedAt),
    entry?.entry.label ?? "",
  ].join(KEY_SEPARATOR)

const keptThrough = (walk: Walk, callback: StoredCodeBlock, index: FactIndex): Kept | null => {
  const handedCall = handedCallOf(walk.block, index)
  const isCallbackOfKept = handedCall !== null && callback.parentBlockId === handedCall.id && CALLBACK_TYPES.has(callback.type)
  return isCallbackOfKept ? { usedAt: walk.lastUse ?? rangeOfBlock(walk.block), keptAt: rangeOfBlock(handedCall) } : null
}

const arriveWithin = (walk: Walk, step: Step, index: FactIndex): Walk => ({
  ...walk,
  block: step.next,
  kept: walk.kept ?? keptThrough(walk, step.next, index),
  lastUse: step.usedAt ?? walk.lastUse,
})

const hopThrough = (walk: Walk, step: Step): Walk => ({
  ...walk,
  block: step.next,
  through: step.hop === null ? walk.through : [...walk.through, step.hop],
  handedAt: step.handedAt ?? walk.handedAt,
  lastUse: walk.lastUse ?? step.usedAt,
})

function walkFrom(walk: Walk, index: FactIndex, visited: ReadonlySet<string>): Walked {
  const key = walkKeyOf(walk)
  if (visited.has(key)) return { facts: [], visited }
  return blocksOf(walk.block.nextBlockIds, index).reduce<Walked>(
    (walked, next) => {
      const taken = takeStep(walk, stepTo(walk.block, next, index), index, walked.visited)
      return { facts: [...walked.facts, ...taken.facts], visited: taken.visited }
    },
    { facts: [], visited: new Set([...visited, key]) },
  )
}

function takeStep(walk: Walk, step: Step, index: FactIndex, visited: ReadonlySet<string>): Walked {
  if (step.next.type === ARGUMENT) return walkFrom(hopThrough(walk, step), index, visited)
  const to = siteOf(step.next, index)
  if (to === null) return { facts: [], visited }
  const isWithinStart = walk.home === null && rootOf(walk.block, index).id === rootOf(step.next, index).id
  if (isWithinStart || (walk.home !== null && isSameSite(walk.home, to))) return walkFrom(arriveWithin(walk, step, index), index, visited)
  const arrived: Walk = { block: step.next, home: to, entry: null, kept: null, lastUse: null, through: [], handedAt: null }
  const further = walkFrom(arrived, index, visited)
  if (walk.home !== null) return { facts: [edgeFrom(walk, walk.home, to, step), ...further.facts], visited: further.visited }
  const entered: EntryFact[] = walk.entry === null ? [] : [{ kind: "entry", site: to, entry: walk.entry.entry, actedAt: null, end: walk.entry.end }]
  return { facts: [...entered, ...further.facts], visited: further.visited }
}

const findAttributeSite = (file: ASTGraphFile, range: SourceRange): AttributeSite | null => {
  const found = file.listSyntaxSitesAt(range).find((site) => site.kind === "attribute" && isSameRange(site.range, range))
  return found?.kind === "attribute" ? found : null
}

const findListenerSite = (file: ASTGraphFile, range: SourceRange): ArgumentSite | null => {
  const found = file.listSyntaxSitesIn(range).find((site) => site.kind === "argument" && isListener(site))
  return found?.kind === "argument" ? found : null
}

const endAt = (file: ASTGraphFile, range: SourceRange): EntryEnd => ({ file, range, event: null, element: null, library: null })

const endOfAction = (file: ASTGraphFile, handler: AttributeSite): EntryEnd => ({
  file,
  range: handler.range,
  event: handler.event ?? handler.attribute,
  element: handler.element,
  library: handler.elementName === null ? null : file.findExternalImportSpecifier(handler.elementName),
})

const entryOfRenderEvent = (top: StoredCodeBlock, site: CodeSite, index: FactIndex): EntryFact => {
  const range = rangeOfBlock(top)
  const handler = findAttributeSite(site.file, range)
  if (handler !== null) return { kind: "entry", site, entry: userActionOf(handler), actedAt: range, end: endOfAction(site.file, handler) }
  const element = parentOf(top, index)?.name ?? null
  const event = top.name ?? null
  if (element === null || event === null) return { kind: "entry", site, entry: boundaryOf(event ?? UNNAMED_CALLBACK), actedAt: range, end: { ...endAt(site.file, range), event } }
  return { kind: "entry", site, entry: userActionOf({ attribute: event, element, text: null }), actedAt: range, end: { ...endAt(site.file, range), event, element } }
}

const calledNameOf = (block: StoredCodeBlock, index: FactIndex): string | null => {
  const called = block.outerSymbols.find((symbol) => symbol.use === "call")
  if (called === undefined) return null
  const member = called.member?.path ?? []
  if (member.length > 0) return member[member.length - 1]
  if (called.type === "unopened-import") return called.importedName
  return blocksOf([referencedIdOf(called) ?? ""], index).map((referenced) => referenced.name ?? null)[0] ?? null
}

const entryOfCodeEvent = (top: StoredCodeBlock, site: CodeSite, index: FactIndex): EntryFact => {
  const range = rangeOfBlock(top)
  const holder = parentOf(top, index)
  const listener = findListenerSite(site.file, holder === null ? range : rangeOfBlock(holder))
  if (listener !== null) {
    const target = listenerTargetOf(listener)
    return { kind: "entry", site, entry: listenedEventOf(listener.literal, target), actedAt: range, end: { file: site.file, range, event: listener.literal, element: target, library: null } }
  }
  const event = top.catalogue?.event ?? holder?.catalogue?.event ?? null
  const isSubscription = top.name === undefined || /^\d+$/.test(top.name)
  const entry = isSubscription && event === null ? EVENT_BUS_BOUNDARY : boundaryOf(event ?? top.name ?? UNNAMED_CALLBACK)
  return { kind: "entry", site, entry, actedAt: range, end: { ...endAt(site.file, range), event: event ?? top.name ?? null } }
}

const entryOfEffect = (top: StoredCodeBlock, site: CodeSite, index: FactIndex): EntryFact => {
  const range = rangeOfBlock(top)
  const name = calledNameOf(top, index)
  return { kind: "entry", site, entry: effectOf(name ?? UNNAMED_EFFECT), actedAt: range, end: { ...endAt(site.file, range), event: name } }
}

const runsOf = (top: StoredCodeBlock): CatalogueRuns | null => RUNS_BY_TYPE.get(top.type) ?? top.catalogue?.runs ?? null

const requestLabelOf = ({ catalogue }: StoredCodeBlock, holder: StoredCodeBlock | null): string => {
  const method = catalogue?.method ?? holder?.catalogue?.method ?? null
  const path = catalogue?.path ?? holder?.catalogue?.path ?? null
  if (method === null && path === null) return EVERY_REQUEST_LABEL
  return [method === null || method === "*" ? "ALL" : method.toUpperCase(), path ?? ""].join(" ").trim()
}

const slotEntryOf = (top: StoredCodeBlock, index: FactIndex): EntryPoint | null => {
  const runs = runsOf(top)
  const holder = parentOf(top, index)
  if (runs === PAGE_RUNS) return top.catalogue?.path === null || top.catalogue === null ? PAGE_VISIT : pageVisitOf(top.catalogue.path)
  if (runs !== null && REQUEST_RUNS.has(runs)) return apiCallOf(requestLabelOf(top, holder))
  return runs !== null && COMMAND_RUNS.has(runs) ? commandOf(top.catalogue?.name ?? top.name ?? runs) : null
}

const hasChangeWithin = (block: StoredCodeBlock, index: FactIndex): boolean => heldBy(block, index).some((held) => held.lineOfCodeDiffs !== null)

const startAt = (top: StoredCodeBlock, home: CodeSite | null, entry: PendingEntry | null): Walk => ({ block: top, home, entry, kept: null, lastUse: null, through: [], handedAt: null })

const entryOfRoot = (top: StoredCodeBlock, site: CodeSite, index: FactIndex): EntryPoint => {
  if (site.root === null) return APP_START
  const named = entryOfUnused(site.file, site.root)
  return named.trigger === UNUSED.trigger && isComponentBlock(top, index) ? PAGE_VISIT : named
}

const startsOf = (top: StoredCodeBlock, index: FactIndex): { readonly entries: readonly EntryFact[], readonly walk: Walk } | null => {
  const site = siteOf(top, index)
  if (site === null) return null
  const range = rangeOfBlock(top)
  const slotEntry = slotEntryOf(top, index)
  if (slotEntry !== null || (top.type === ROOT_STATEMENT && !hasChangeWithin(top, index))) {
    const pending: PendingEntry = { entry: slotEntry ?? APP_START, end: endAt(site.file, range) }
    if (!hasChangeWithin(top, index) && !CALLABLE_TYPES.has(top.type)) return { entries: [], walk: startAt(top, null, pending) }
    return { entries: [{ kind: "entry", site, entry: pending.entry, actedAt: null, end: pending.end }], walk: startAt(top, site, null) }
  }
  if (top.type === RENDER_EVENT) return { entries: [entryOfRenderEvent(top, site, index)], walk: startAt(top, site, null) }
  if (top.type === CODE_EVENT) return { entries: [entryOfCodeEvent(top, site, index)], walk: startAt(top, site, null) }
  if (top.type === COMPONENT_EFFECT) return { entries: [entryOfEffect(top, site, index)], walk: startAt(top, site, null) }
  if (top.parentBlockId === null) return { entries: [{ kind: "entry", site, entry: entryOfRoot(top, site, index), actedAt: null, end: endAt(site.file, range) }], walk: startAt(top, site, null) }
  const isNamedCallable = CALLABLE_TYPES.has(top.type) && top.name !== undefined
  return {
    entries: [{ kind: "entry", site, entry: UNUSED, actedAt: isNamedCallable ? range : null, end: { ...endAt(site.file, range), event: top.name ?? null } }],
    walk: startAt(top, site, null),
  }
}

const listChangedSites = ({ codeBlocks }: StoredCodeGroupGraph, index: FactIndex): CodeSite[] =>
  firstOfEach(
    codeBlocks
      .filter((block) => block.lineOfCodeDiffs !== null && block.diffSourceIds.length > 0)
      .flatMap((block) => {
        const site = siteOf(block, index)
        return site === null ? [] : [site]
      }),
    codeSiteIdOf,
  )

export const traceChainFacts = (group: StoredCodeGroupGraph, files: FilesByPath): ChainFacts => {
  const index: FactIndex = { blockById: new Map(group.codeBlocks.map((block) => [block.id, block] as const)), files }
  const walked = blocksOf(group.diffChainIds, index).reduce<Walked>(
    (traced, top) => {
      const starts = startsOf(top, index)
      if (starts === null) return traced
      const further = walkFrom(starts.walk, index, traced.visited)
      return { facts: [...traced.facts, ...starts.entries, ...further.facts], visited: further.visited }
    },
    { facts: [], visited: new Set() },
  )
  return { facts: walked.facts, changedSites: listChangedSites(group, index) }
}
