import {
  siteKey,
  traceUsages,
  usageNodeIdOf,
  type ArgumentSite,
  type AttributeSite,
  type BaseASTGraphFile,
  type Encapsulation,
  type FileUsage,
  type KeptSite,
  type LineRange,
  type SourceRange,
  type SymbolTarget,
  type Usage,
} from "@/ast-graph"
import { containsLines, containsRange, overlapsLines } from "@/ast-graph/source-range"
import type { ConnectionCertainty, ConnectionKind } from "@flightplan/configurations"
import { listContextReaders } from "./context-readers"
import {
  apiCallOf,
  APP_START,
  CONTEXT_BOUNDARY,
  entryOfTopLevelUse,
  entryOfUnused,
  EVENT_BUS_BOUNDARY,
  listenedEventOf,
  pageVisitOf,
  scheduledJobOf,
  userActionOf,
  type EntryPoint,
} from "./entry-points"
import { listPropUsages } from "./resolve-props"
import { isHandlerAttribute, listenerTargetOf, roleOf, routeLabelOf, type UsageRole } from "./usage-role"

export interface CodeSite {
  readonly file: BaseASTGraphFile
  readonly root: Encapsulation | null
}

export interface EdgeFact {
  readonly kind: "edge"
  readonly from: CodeSite
  readonly to: CodeSite
  readonly connection: ConnectionKind
  readonly certainty: ConnectionCertainty
  readonly through: readonly string[]
  readonly usedAt: SourceRange
  readonly keptAt: SourceRange | null
  readonly handedAt: SourceRange | null
  readonly isRender: boolean
}

export interface EntryEnd {
  readonly file: BaseASTGraphFile
  readonly range: SourceRange
  readonly event: string | null
  readonly element: string | null
  readonly library: string | null
}

export interface EntryFact {
  readonly kind: "entry"
  readonly site: CodeSite
  readonly entry: EntryPoint
  readonly actedAt: SourceRange | null
  readonly end: EntryEnd | null
}

export type JourneyFact = EdgeFact | EntryFact

interface Wrapper {
  readonly site: CodeSite
  readonly label: string
  readonly usedAt: SourceRange
}

interface Carried {
  readonly target: CodeSite
  readonly through: readonly string[]
  readonly wrapper: Wrapper | null
  readonly handedAt: SourceRange | null
}

interface Tracing {
  readonly files: readonly BaseASTGraphFile[]
  readonly changedIds: ReadonlySet<string>
}

interface Arrival {
  readonly tracing: Tracing
  readonly file: BaseASTGraphFile
  readonly usage: Usage
  readonly holder: CodeSite
  readonly carried: Carried
  readonly path: ReadonlySet<string>
}

interface Settled {
  readonly facts: readonly JourneyFact[]
  readonly carried: Carried
}

type Link = Pick<EdgeFact, "connection" | "certainty" | "isRender">

interface Listening {
  readonly file: BaseASTGraphFile
  readonly listener: ArgumentSite
  readonly actedAt: SourceRange | null
}

export const TOP_LEVEL_NAME = "top level"

const NAME_SEPARATOR = "."
const KEY_SEPARATOR = ":"
const RUN_KEY = "run"
const PROP_KEY = "prop"
const CONTEXT_KEY = "context"
const CALL_LINK: Link = { connection: "call", certainty: "proven", isRender: false }
const RENDER_LINK: Link = { connection: "call", certainty: "proven", isRender: true }
const VALUE_LINK: Link = { connection: "value", certainty: "proven", isRender: false }
const RESULT_LINK: Link = { connection: "value", certainty: "assumed", isRender: false }
const EMPTY_PATH: ReadonlySet<string> = new Set()
const LINE_START_COLUMN = 0

export const codeSiteIdOf = ({ file, root }: CodeSite): string => usageNodeIdOf(file.filePath, root?.name ?? TOP_LEVEL_NAME)

const isSameSite = (one: CodeSite, two: CodeSite): boolean => codeSiteIdOf(one) === codeSiteIdOf(two)

const startingAt = (target: CodeSite): Carried => ({ target, through: [], wrapper: null, handedAt: null })

const handedFrom = (target: CodeSite, handedAt: SourceRange): Carried => ({ ...startingAt(target), handedAt })

const endAt = (file: BaseASTGraphFile, range: SourceRange): EntryEnd => ({ file, range, event: null, element: null, library: null })

const entryAt = (site: CodeSite, entry: EntryPoint, end: EntryEnd | null): EntryFact => ({ kind: "entry", site, entry, actedAt: null, end })

const actionEndOf = (file: BaseASTGraphFile, handler: AttributeSite): EntryEnd => ({
  file,
  range: handler.range,
  event: handler.attribute,
  element: handler.element,
  library: handler.elementName === null ? null : file.findExternalImportSpecifier(handler.elementName),
})

const actionAt = (site: CodeSite, handler: AttributeSite): EntryFact => ({
  kind: "entry",
  site,
  entry: userActionOf(handler),
  actedAt: handler.range,
  end: actionEndOf(site.file, handler),
})

const listenerAt = (site: CodeSite, { file, listener, actedAt }: Listening): EntryFact => {
  const target = listenerTargetOf(listener)
  const end: EntryEnd = { file, range: listener.range, event: listener.literal, element: target, library: null }
  return { ...entryAt(site, listenedEventOf(listener.literal, target), end), actedAt }
}

const nameUsedAt = (file: BaseASTGraphFile, { start, end }: SourceRange): string | null =>
  start.line === end.line ? file.readLine(start.line).slice(start.column, end.column) : null

const findKeeperAround = ({ file, usage }: FileUsage): KeptSite | null => {
  const keeper = file.listSyntaxSitesAt(usage.range).find((site) => site.kind === "kept")
  return keeper?.kind === "kept" ? keeper : null
}

const edgesTo = (from: CodeSite, { target, through, handedAt }: Carried, usedAt: SourceRange, link: Link): EdgeFact[] =>
  isSameSite(from, target)
    ? []
    : [{ kind: "edge", from, to: target, through, usedAt, keptAt: null, handedAt, ...link, connection: through.length > 0 ? "value" : link.connection }]

const settle = (carried: Carried): Settled => {
  const { wrapper } = carried
  if (wrapper === null) return { facts: [], carried }
  return {
    facts: edgesTo(wrapper.site, carried, wrapper.usedAt, CALL_LINK),
    carried: startingAt(wrapper.site),
  }
}

const absorb = (carried: Carried, holder: CodeSite, isForwarding: boolean): Settled => {
  const { wrapper } = carried
  if (wrapper === null) return { facts: [], carried }
  if (isSameSite(holder, wrapper.site) && !isForwarding) return settle(carried)
  return { facts: [], carried: { ...carried, through: [wrapper.label, ...carried.through], wrapper: null } }
}

const isThinWrapper = (file: BaseASTGraphFile, encapsulation: Encapsulation, usedAt: SourceRange): boolean => {
  const outermost = file.listSyntaxSitesIn(encapsulation.range).find((site) => site.kind === "function" && containsRange(site.range, usedAt))
  return outermost?.kind === "function" && outermost.wrapped !== null && containsRange(outermost.wrapped, usedAt)
}

const nameIn = (root: Encapsulation, inner: Encapsulation): string =>
  inner === root ? root.name : [root.name, inner.name].join(NAME_SEPARATOR)

const rootOf = (file: BaseASTGraphFile, encapsulation: Encapsulation): Encapsulation => {
  const [root = encapsulation] = file.listEncapsulationPath(encapsulation)
  return root
}

const isRunOutside = (file: BaseASTGraphFile, encapsulation: Encapsulation) => (used: FileUsage): boolean =>
  used.file.isRunAt(used.usage.range) && (used.file !== file || !containsRange(encapsulation.range, used.usage.range))

const traceTopLevelUse = (role: UsageRole, incoming: Carried, { file, usage }: FileUsage): JourneyFact[] => {
  const { facts, carried } = settle(incoming)
  const { target } = carried
  const usedAt = endAt(file, usage.range)
  if (role.kind === "route") return [...facts, entryAt(target, apiCallOf(routeLabelOf(role.site)), endAt(file, role.site.range))]
  if (role.kind === "page") return [...facts, entryAt(target, pageVisitOf(role.site.path), endAt(file, role.site.range))]
  if (role.kind === "listener") return [...facts, listenerAt(target, { file, listener: role.site, actedAt: null })]
  if (role.kind === "event-bus") return [...facts, entryAt(target, EVENT_BUS_BOUNDARY, usedAt)]
  if (role.kind === "schedule" && target.root !== null) return [...facts, entryAt(target, scheduledJobOf(target.root.name), usedAt)]
  return [...facts, entryAt(target, target.root === null ? APP_START : entryOfTopLevelUse(target.file, target.root), usedAt)]
}

const linesAround = ({ start, end }: SourceRange): SourceRange => ({
  start: { line: start.line, column: LINE_START_COLUMN },
  end: { line: end.line + 1, column: LINE_START_COLUMN },
})

const takesMember = ({ file, usage }: FileUsage, member: string): boolean =>
  file.listSyntaxSitesIn(linesAround(usage.range)).some((site) =>
    (site.kind === "member" && site.property === member) || (site.kind === "kept" && site.properties.some(({ property }) => property === member)))

const listTakenResults = ({ file, usage }: FileUsage, member: string): SymbolTarget[] => {
  const keeper = file.listSyntaxSitesAt(usage.range).find((site) => site.kind === "kept")
  if (keeper?.kind !== "kept") return []
  return keeper.name === null ? keeper.properties.filter(({ property }) => property === member).map(({ binding }) => binding) : [keeper.name]
}

function traceMemberUse(tracing: Tracing, used: FileUsage, member: string, incoming: Carried, path: ReadonlySet<string>): JourneyFact[] {
  const { file, usage } = used
  const results = listTakenResults(used, member)
  if (usage.rootEncapsulation === null || results.length === 0) return traceArrival(tracing, used, null, incoming, path)
  const { facts, carried } = settle(incoming)
  return [...facts, ...traceResults({ tracing, file, usage, holder: { file, root: usage.rootEncapsulation }, carried, path }, results)]
}

function traceRunners(tracing: Tracing, file: BaseASTGraphFile, encapsulation: Encapsulation, carried: Carried, path: ReadonlySet<string>): JourneyFact[] {
  const key = [RUN_KEY, siteKey({ file, encapsulation })].join(KEY_SEPARATOR)
  if (path.has(key)) return []
  const climbed = new Set([...path, key])
  const root = rootOf(file, encapsulation)
  const usages = traceUsages(tracing.files, { file, encapsulation }).filter(isRunOutside(file, encapsulation))
  const isMember = encapsulation !== root && file.findEncapsulationDeclaration(encapsulation) === null
  const taking = isMember ? usages.filter((used) => takesMember(used, encapsulation.name)) : []
  if (taking.length > 0) return taking.flatMap((used) => traceMemberUse(tracing, used, encapsulation.name, carried, climbed))
  if (usages.length > 0) return usages.flatMap((used) => traceArrival(tracing, used, null, carried, climbed))
  if (encapsulation !== root) return traceRunners(tracing, file, root, carried, climbed)
  const settled = settle(carried)
  return [...settled.facts, entryAt(settled.carried.target, entryOfUnused(file, root), endAt(file, root.range))]
}

const traceRun = ({ tracing, file, usage, holder, carried, path }: Arrival, link: Link): JourneyFact[] => {
  const inner = usage.encapsulation ?? holder.root
  if (inner === null || holder.root === null) return []
  const isFoldable = !tracing.changedIds.has(codeSiteIdOf(holder)) && !isSameSite(holder, carried.target)
  if (isFoldable && isThinWrapper(file, inner, usage.range)) {
    const wrapper = { site: holder, label: nameIn(holder.root, inner), usedAt: usage.range }
    return traceRunners(tracing, file, inner, { ...carried, wrapper }, path)
  }
  return [...edgesTo(holder, carried, usage.range, link), ...traceRunners(tracing, file, inner, startingAt(holder), path)]
}

function followProp(tracing: Tracing, forwarded: readonly FileUsage[], attribute: string, next: Carried, followed: ReadonlySet<string>): JourneyFact[] {
  return forwarded.flatMap((used) => {
    const component = used.usage.rootEncapsulation?.name ?? ""
    return traceArrival(tracing, used, [component, attribute].join(NAME_SEPARATOR), next, followed)
  })
}

const traceResultUse = (arrival: Arrival, used: Usage): JourneyFact[] | null => {
  const { tracing, file, holder, path } = arrival
  const role = roleOf(file.listSyntaxSitesAt(used.range))
  if (role.kind === "handler") return [actionAt(holder, role.site)]
  if (role.kind === "provider") return traceContextReaders({ ...arrival, usage: used, carried: startingAt(holder) }, role.site, null)
  if (role.kind === "prop" && isHandlerAttribute(role.site.attribute)) {
    const forwarded = listPropUsages(tracing.files, file, role.site)
    const key = [PROP_KEY, codeSiteIdOf(holder), role.site.element, role.site.attribute].join(KEY_SEPARATOR)
    if (forwarded.length === 0) return [actionAt(holder, role.site)]
    return path.has(key) ? [] : followProp(tracing, forwarded, role.site.attribute, handedFrom(holder, used.range), new Set([...path, key]))
  }
  const inner = used.encapsulation
  return inner === null || inner === holder.root ? null : traceRunners(tracing, file, inner, startingAt(holder), path)
}

const traceResults = (arrival: Arrival, results: readonly SymbolTarget[]): JourneyFact[] => {
  const { tracing, file, usage, holder, carried, path } = arrival
  if (holder.root === null) return []
  const uses = results.flatMap((result) => file.traceUsage(result))
  const traced = uses.map((used) => traceResultUse(arrival, used))
  const isReadInBody = traced.length === 0 || traced.includes(null)
  const kept = uses.flatMap((used) => edgesTo(holder, carried, used.range, RESULT_LINK)).map((edge) => ({ ...edge, keptAt: usage.range }))
  return [
    ...(uses.length === 0 ? edgesTo(holder, carried, usage.range, RESULT_LINK) : kept),
    ...traced.flatMap((facts) => facts ?? []),
    ...(isReadInBody ? traceRunners(tracing, file, holder.root, startingAt(holder), path) : []),
  ]
}

function traceContextReader(arrival: Arrival, reader: FileUsage, provided: string | null, path: ReadonlySet<string>): JourneyFact[] {
  const { tracing, holder } = arrival
  const keeper = findKeeperAround(reader)
  const root = reader.usage.rootEncapsulation
  if (keeper?.name !== null || root === null) return traceArrival(tracing, reader, null, startingAt(holder), path)
  const taken = keeper.properties.filter(({ property }) => provided === null || property === provided).map(({ binding }) => binding)
  if (taken.length === 0) return []
  const reading: Arrival = { tracing, file: reader.file, usage: reader.usage, holder: { file: reader.file, root }, carried: startingAt(holder), path }
  return traceResults(reading, taken)
}

function traceContextReaders(arrival: Arrival, provider: AttributeSite, provided: string | null): JourneyFact[] {
  const { tracing, file, usage, holder, path } = arrival
  const key = [CONTEXT_KEY, codeSiteIdOf(holder), provider.element].join(KEY_SEPARATOR)
  if (path.has(key)) return []
  const followed = new Set([...path, key])
  const facts = listContextReaders(tracing.files, file, provider).flatMap((reader) => traceContextReader(arrival, reader, provided, followed))
  return facts.length > 0 ? facts : [entryAt(holder, CONTEXT_BOUNDARY, endAt(file, usage.range))]
}

function traceArrival(tracing: Tracing, used: FileUsage, hopLabel: string | null, incoming: Carried, path: ReadonlySet<string>): JourneyFact[] {
  const { file, usage } = used
  const role = roleOf(file.listSyntaxSitesAt(usage.range))
  const root = usage.rootEncapsulation
  if (root === null) return traceTopLevelUse(role, incoming, used)
  const holder: CodeSite = { file, root }
  const forwarded = role.kind === "prop" ? listPropUsages(tracing.files, file, role.site) : []
  const wasWrapped = incoming.wrapper !== null && isSameSite(holder, incoming.wrapper.site)
  const { facts, carried } = absorb(incoming, holder, forwarded.length > 0)
  const arrival: Arrival = { tracing, file, usage, holder, carried, path }
  if (role.kind === "prop" && forwarded.length > 0) {
    const key = [PROP_KEY, codeSiteIdOf(holder), role.site.element, role.site.attribute].join(KEY_SEPARATOR)
    if (path.has(key)) return [...facts]
    const isFolded = wasWrapped || (role.isDirect && !tracing.changedIds.has(codeSiteIdOf(holder)) && !isSameSite(holder, carried.target))
    const folded = wasWrapped ? carried : { ...carried, through: [hopLabel ?? root.name, ...carried.through] }
    return [
      ...facts,
      ...(isFolded ? [] : edgesTo(holder, carried, usage.range, VALUE_LINK)),
      ...followProp(tracing, forwarded, role.site.attribute, isFolded ? folded : handedFrom(holder, usage.range), new Set([...path, key])),
    ]
  }
  if (role.kind === "handler" || (role.kind === "prop" && isHandlerAttribute(role.site.attribute))) {
    return [...facts, ...edgesTo(holder, carried, usage.range, CALL_LINK), actionAt(holder, role.site)]
  }
  const usedAt = endAt(file, usage.range)
  if (role.kind === "provider") {
    return [...facts, ...edgesTo(holder, carried, usage.range, VALUE_LINK), ...traceContextReaders(arrival, role.site, nameUsedAt(file, usage.range))]
  }
  if (role.kind === "listener") {
    return [...facts, ...edgesTo(holder, carried, usage.range, VALUE_LINK), listenerAt(holder, { file, listener: role.site, actedAt: role.site.range })]
  }
  if (role.kind === "event-bus") return [...facts, ...edgesTo(holder, carried, usage.range, VALUE_LINK), entryAt(holder, EVENT_BUS_BOUNDARY, usedAt)]
  if (role.kind === "route") return [...facts, entryAt(carried.target, apiCallOf(routeLabelOf(role.site)), endAt(file, role.site.range))]
  if (role.kind === "page") return [...facts, entryAt(carried.target, pageVisitOf(role.site.path), endAt(file, role.site.range))]
  if (role.kind === "schedule" && carried.target.root !== null) return [...facts, entryAt(carried.target, scheduledJobOf(carried.target.root.name), usedAt)]
  if (role.kind === "argument" && role.site.results.length > 0) return [...facts, ...traceResults(arrival, role.site.results)]
  return [...facts, ...traceRun(arrival, role.kind === "render" ? RENDER_LINK : CALL_LINK)]
}

export interface ChangedSite {
  readonly site: CodeSite
  readonly encapsulation: Encapsulation | null
  readonly lines: readonly LineRange[]
}

const listChangedHandlers = ({ site, encapsulation, lines }: ChangedSite): AttributeSite[] => {
  if (encapsulation === null) return []
  return site.file
    .listSyntaxSitesIn(encapsulation.range)
    .flatMap((found) => (found.kind === "attribute" && found.isBuiltIn && isHandlerAttribute(found.attribute) ? [found] : []))
    .filter((handler) => lines.some((range) => overlapsLines(handler.range, range)))
}

const isWithinHandlers = (handlers: readonly AttributeSite[], lines: readonly LineRange[]): boolean =>
  lines.every((range) => handlers.some((handler) => handler.range.start.line < handler.range.end.line && containsLines(handler.range, range)))

const traceChange = (tracing: Tracing, changed: ChangedSite): JourneyFact[] => {
  const { site, encapsulation, lines } = changed
  if (encapsulation === null) return [entryAt(site, APP_START, null)]
  const handlers = listChangedHandlers(changed)
  const actions = handlers.map((handler) => actionAt(site, handler))
  if (handlers.length > 0 && isWithinHandlers(handlers, lines)) return actions
  return [...actions, ...traceRunners(tracing, site.file, encapsulation, startingAt(site), EMPTY_PATH)]
}

export const traceJourney = (files: readonly BaseASTGraphFile[], changed: readonly ChangedSite[]): JourneyFact[] => {
  const tracing: Tracing = { files, changedIds: new Set(changed.map(({ site }) => codeSiteIdOf(site))) }
  return changed.flatMap((site) => traceChange(tracing, site))
}
