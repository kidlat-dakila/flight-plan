import {
  siteKey,
  traceUsages,
  usageNodeIdOf,
  type AttributeSite,
  type BaseASTGraphFile,
  type Encapsulation,
  type FileUsage,
  type LineRange,
  type SourceRange,
  type SymbolTarget,
  type Usage,
} from "@/ast-graph"
import { containsLines, containsRange, overlapsLines } from "@/ast-graph/source-range"
import type { ConnectionCertainty, ConnectionKind } from "@flightplan/configurations"
import {
  apiCallOf,
  APP_START,
  CONTEXT_BOUNDARY,
  entryOfTopLevelUse,
  entryOfUnused,
  EVENT_BUS_BOUNDARY,
  pageVisitOf,
  scheduledJobOf,
  userActionOf,
  type EntryPoint,
} from "./entry-points"
import { listPropUsages } from "./resolve-props"
import { isHandlerAttribute, roleOf, routeLabelOf, type UsageRole } from "./usage-role"

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
  readonly isRender: boolean
}

export interface EntryFact {
  readonly kind: "entry"
  readonly site: CodeSite
  readonly entry: EntryPoint
  readonly actedAt: SourceRange | null
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

export const TOP_LEVEL_NAME = "top level"

const NAME_SEPARATOR = "."
const KEY_SEPARATOR = ":"
const RUN_KEY = "run"
const PROP_KEY = "prop"
const CALL_LINK: Link = { connection: "call", certainty: "proven", isRender: false }
const RENDER_LINK: Link = { connection: "call", certainty: "proven", isRender: true }
const VALUE_LINK: Link = { connection: "value", certainty: "proven", isRender: false }
const RESULT_LINK: Link = { connection: "value", certainty: "assumed", isRender: false }
const EMPTY_PATH: ReadonlySet<string> = new Set()
const LINE_START_COLUMN = 0

export const codeSiteIdOf = ({ file, root }: CodeSite): string => usageNodeIdOf(file.filePath, root?.name ?? TOP_LEVEL_NAME)

const isSameSite = (one: CodeSite, two: CodeSite): boolean => codeSiteIdOf(one) === codeSiteIdOf(two)

const startingAt = (target: CodeSite): Carried => ({ target, through: [], wrapper: null })

const entryAt = (site: CodeSite, entry: EntryPoint): EntryFact => ({ kind: "entry", site, entry, actedAt: null })

const actionAt = (site: CodeSite, handler: AttributeSite): EntryFact => ({ kind: "entry", site, entry: userActionOf(handler), actedAt: handler.range })

const edgesTo = (from: CodeSite, { target, through }: Carried, usedAt: SourceRange, link: Link): EdgeFact[] =>
  isSameSite(from, target) ? [] : [{ kind: "edge", from, to: target, through, usedAt, ...link, connection: through.length > 0 ? "value" : link.connection }]

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
  return { facts: [], carried: { target: carried.target, through: [wrapper.label, ...carried.through], wrapper: null } }
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

const traceTopLevelUse = (role: UsageRole, incoming: Carried): JourneyFact[] => {
  const { facts, carried } = settle(incoming)
  const { file, root } = carried.target
  if (role.kind === "route") return [...facts, entryAt(carried.target, apiCallOf(routeLabelOf(role.site)))]
  if (role.kind === "page") return [...facts, entryAt(carried.target, pageVisitOf(role.site.path))]
  if (role.kind === "event-bus") return [...facts, entryAt(carried.target, EVENT_BUS_BOUNDARY)]
  if (role.kind === "schedule" && root !== null) return [...facts, entryAt(carried.target, scheduledJobOf(root.name))]
  return [...facts, entryAt(carried.target, root === null ? APP_START : entryOfTopLevelUse(file, root))]
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
  return [...settled.facts, entryAt(settled.carried.target, entryOfUnused(file, root))]
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
  if (role.kind === "prop" && isHandlerAttribute(role.site.attribute)) {
    const forwarded = listPropUsages(tracing.files, file, role.site)
    const key = [PROP_KEY, codeSiteIdOf(holder), role.site.element, role.site.attribute].join(KEY_SEPARATOR)
    if (forwarded.length === 0) return [actionAt(holder, role.site)]
    return path.has(key) ? [] : followProp(tracing, forwarded, role.site.attribute, startingAt(holder), new Set([...path, key]))
  }
  const inner = used.encapsulation
  return inner === null || inner === holder.root ? null : traceRunners(tracing, file, inner, startingAt(holder), path)
}

const traceResults = (arrival: Arrival, results: readonly SymbolTarget[]): JourneyFact[] => {
  const { tracing, file, usage, holder, carried, path } = arrival
  if (holder.root === null) return []
  const traced = results.flatMap((result) => file.traceUsage(result)).map((used) => traceResultUse(arrival, used))
  const isReadInBody = traced.length === 0 || traced.includes(null)
  return [
    ...edgesTo(holder, carried, usage.range, RESULT_LINK),
    ...traced.flatMap((facts) => facts ?? []),
    ...(isReadInBody ? traceRunners(tracing, file, holder.root, startingAt(holder), path) : []),
  ]
}

function traceArrival(tracing: Tracing, { file, usage }: FileUsage, hopLabel: string | null, incoming: Carried, path: ReadonlySet<string>): JourneyFact[] {
  const role = roleOf(file.listSyntaxSitesAt(usage.range))
  const root = usage.rootEncapsulation
  if (root === null) return traceTopLevelUse(role, incoming)
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
      ...followProp(tracing, forwarded, role.site.attribute, isFolded ? folded : startingAt(holder), new Set([...path, key])),
    ]
  }
  if (role.kind === "handler" || (role.kind === "prop" && isHandlerAttribute(role.site.attribute))) {
    return [...facts, ...edgesTo(holder, carried, usage.range, CALL_LINK), actionAt(holder, role.site)]
  }
  if (role.kind === "provider") return [...facts, ...edgesTo(holder, carried, usage.range, VALUE_LINK), entryAt(holder, CONTEXT_BOUNDARY)]
  if (role.kind === "event-bus") return [...facts, ...edgesTo(holder, carried, usage.range, VALUE_LINK), entryAt(holder, EVENT_BUS_BOUNDARY)]
  if (role.kind === "route") return [...facts, entryAt(carried.target, apiCallOf(routeLabelOf(role.site)))]
  if (role.kind === "page") return [...facts, entryAt(carried.target, pageVisitOf(role.site.path))]
  if (role.kind === "schedule" && carried.target.root !== null) return [...facts, entryAt(carried.target, scheduledJobOf(carried.target.root.name))]
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
  if (encapsulation === null) return [entryAt(site, APP_START)]
  const handlers = listChangedHandlers(changed)
  const actions = handlers.map((handler) => actionAt(site, handler))
  if (handlers.length > 0 && isWithinHandlers(handlers, lines)) return actions
  return [...actions, ...traceRunners(tracing, site.file, encapsulation, startingAt(site), EMPTY_PATH)]
}

export const traceJourney = (files: readonly BaseASTGraphFile[], changed: readonly ChangedSite[]): JourneyFact[] => {
  const tracing: Tracing = { files, changedIds: new Set(changed.map(({ site }) => codeSiteIdOf(site))) }
  return changed.flatMap((site) => traceChange(tracing, site))
}
