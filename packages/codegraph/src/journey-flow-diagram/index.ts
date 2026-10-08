import type { AttributeSite, BaseASTGraphFile, Encapsulation, LineRange, Position, SourceRange, Statement } from "@/ast-graph"
import { containsLines, containsRange, joinAdjacentLines, linesOf, overlapsLines } from "@/ast-graph/source-range"
import { firstOfEach } from "@/shared/first-of-each"
import type { ChangeType, DeclarationNode, EntryPointNode, JourneyEdge, JourneyFlow, NodeCategory, TracedLine, TraceEnd } from "@flightplan/configurations"
import { isComponent } from "./entry-points"
import { codeSiteIdOf, TOP_LEVEL_NAME, traceJourney, type ChangedSite, type CodeSite, type EdgeFact, type EntryEnd, type EntryFact, type JourneyFact } from "./trace"
import { buildTracedLines, conditionAt, findMarkupAt, listLinesOf, type TracedSource } from "./traced-lines"
import { listTracedData, listTracedEvents, type HandlerNodeFinder } from "./traced-names"

const DEFAULT_CATEGORY: NodeCategory = "logic"
const COMPONENT_CATEGORY: NodeCategory = "ui"
const HANDLER_CATEGORY: NodeCategory = "event"
const DIFF: ChangeType = "diff"
const RELATED: ChangeType = "related"
const FLOW_ID_PREFIX = "journey:"
const ENTRY_POINT_ID_PREFIX = "entry:"
const ID_SEPARATOR = ":"
const EDGE_SEPARATOR = ">"
const MEMBER_SEPARATOR = "."
const ACTION_LINE_MARK = "@"
const DEFAULT_EVENT = "action"
const LISTED_NAME_LIMIT = 3
const NAME_SEPARATOR = ", "

export const JOURNEY_TOP_LEVEL_NAME = TOP_LEVEL_NAME

const changedSiteKey = ({ site, encapsulation }: Omit<ChangedSite, "lines">): string =>
  [codeSiteIdOf(site), encapsulation?.range.start.line ?? TOP_LEVEL_NAME, encapsulation?.name ?? ""].join(ID_SEPARATOR)

const listChangedTopLevelLines = (file: BaseASTGraphFile): LineRange[] =>
  file
    .listTopLevelStatements()
    .filter((statement) => file.listDiffLines().some((lines) => overlapsLines(statement.range, lines)))
    .map((statement): LineRange => [statement.range.start.line, statement.range.end.line])

const listTouchedWithin = (holder: Encapsulation, lines: LineRange): Encapsulation[] =>
  holder.encapsulations
    .filter((nested) => overlapsLines(nested.range, lines))
    .flatMap((nested) => [nested, ...listTouchedWithin(nested, lines)])

const listChangedSites = (file: BaseASTGraphFile): ChangedSite[] => {
  const located = file.listDiffLocations().flatMap(({ diffLoC, rootEncapsulation, parentEncapsulation }) =>
    [parentEncapsulation, ...listTouchedWithin(parentEncapsulation, diffLoC)].map((encapsulation) => ({
      site: { file, root: rootEncapsulation },
      encapsulation,
      lines: [diffLoC],
    })))
  const topLevelLines = listChangedTopLevelLines(file)
  const topLevel = topLevelLines.length === 0 ? [] : [{ site: { file, root: null }, encapsulation: null, lines: topLevelLines }]
  const changed = [...located, ...topLevel]
  return firstOfEach(changed, changedSiteKey).map((first) => ({
    ...first,
    lines: changed.filter((other) => changedSiteKey(other) === changedSiteKey(first)).flatMap((other) => other.lines),
  }))
}

const isEdge = (fact: JourneyFact): fact is EdgeFact => fact.kind === "edge"

const isEntry = (fact: JourneyFact): fact is EntryFact => fact.kind === "entry"

const entryPointIdOf = ({ site, entry }: EntryFact): string => [`${ENTRY_POINT_ID_PREFIX}${codeSiteIdOf(site)}`, entry.label].join(ID_SEPARATOR)

const changedLinesIn = ({ file, root }: CodeSite): LineRange[] =>
  root === null ? listChangedTopLevelLines(file) : file.listDiffLocations().filter((location) => location.rootEncapsulation === root).map((location) => location.diffLoC)

const tracedSourceOf = ({ file, root }: CodeSite, statements: readonly Statement[]): TracedSource => ({
  statements: root === null ? statements : file.listStatements(root),
  diffLines: file.listDiffLines(),
  readLine: (line) => file.readLine(line),
})

const tracedLinesIn = (site: CodeSite, isChanged: boolean, leavingAt: readonly Position[]): TracedLine[] => {
  const lines = changedLinesIn(site)
  const changedTopLevel = site.file.listTopLevelStatements().filter((statement) => lines.some((range) => overlapsLines(statement.range, range)))
  const targets = isChanged || site.root === null ? { positions: [], lines } : { positions: leavingAt, lines: [] }
  return buildTracedLines(tracedSourceOf(site, changedTopLevel), targets)
}

const isWithinLines = ([startLine, endLine]: LineRange, ranges: readonly LineRange[]): boolean =>
  ranges.some(([rangeStart, rangeEnd]) => rangeStart <= startLine && endLine <= rangeEnd)

const isWhollyNew = ({ file, root }: CodeSite): boolean => {
  const newLines = joinAdjacentLines(file.listDiffLines())
  const ownLines = root === null ? file.listTopLevelStatements().map((statement) => linesOf(statement.range)) : [linesOf(root.range)]
  return ownLines.length > 0 && ownLines.every((lines) => isWithinLines(lines, newLines))
}

const componentOf = ({ file, root }: CodeSite): Encapsulation | null => (root !== null && isComponent(file, root) ? root : null)

const isHeldAt = (heldAt: SourceRange, { ranges }: ActionNode): boolean =>
  ranges.some((range) => containsRange(heldAt, range) || containsRange(range, heldAt))

const handlerNodeFinderOf = (site: CodeSite, actions: readonly ActionNode[]): HandlerNodeFinder => {
  const held = actions.filter((action) => action.isDrawn && codeSiteIdOf(action.site) === codeSiteIdOf(site))
  return (heldAt) => held.find((action) => isHeldAt(heldAt, action))?.id ?? null
}

const toDeclarationNode = (site: CodeSite, isChanged: boolean, edges: readonly EdgeFact[], actions: readonly ActionNode[]): DeclarationNode => {
  const id = codeSiteIdOf(site)
  const leavingAt = edges.filter((edge) => codeSiteIdOf(edge.from) === id).map((edge) => edge.usedAt.start)
  const component = componentOf(site)
  return {
    kind: "declaration",
    id,
    path: site.file.filePath,
    declaration: site.root?.name ?? TOP_LEVEL_NAME,
    changeType: isChanged ? DIFF : RELATED,
    isAdded: isChanged && isWhollyNew(site),
    category: component === null ? DEFAULT_CATEGORY : COMPONENT_CATEGORY,
    label: null,
    description: null,
    tracedLines: tracedLinesIn(site, isChanged, leavingAt),
    events: component === null ? [] : listTracedEvents(site.file, component, handlerNodeFinderOf(site, actions)),
    data: component === null ? [] : listTracedData(site.file, component),
  }
}

const toTraceEnd = ({ file, range, event, element, library }: EntryEnd): TraceEnd => ({
  path: file.filePath,
  line: range.start.line,
  text: file.readLine(range.start.line),
  event,
  element,
  library,
})

const toEntryPointNode = (fact: EntryFact): EntryPointNode => ({
  kind: "entry-point",
  id: entryPointIdOf(fact),
  trigger: fact.entry.trigger,
  label: fact.entry.label,
  description: null,
  traceEnd: fact.end === null ? null : toTraceEnd(fact.end),
})

const linesIn = ({ start, end }: SourceRange): number[] =>
  Array.from({ length: end.line - start.line + 1 }, (_line, offset) => start.line + offset)

const listNestedEncapsulations = (holder: Encapsulation): Encapsulation[] =>
  holder.encapsulations.flatMap((nested) => [nested, ...listNestedEncapsulations(nested)])

const listHandlersRunAt = ({ file, root }: CodeSite, actedAt: SourceRange): Encapsulation[] =>
  root === null
    ? []
    : listNestedEncapsulations(root)
        .filter((nested) => file.findEncapsulationDeclaration(nested) !== null)
        .filter((nested) => file.traceEncapsulationUsage(nested).some((usage) => containsRange(actedAt, usage.range)))

const actionTracedLinesOf = ({ site, actedAt }: EntryFact): TracedLine[] => {
  const { file, root } = site
  if (actedAt === null || root === null) return []
  const element = findMarkupAt(file.listStatements(root), actedAt.start)
  const ranges = [...(element === null ? [actedAt] : [element.range]), ...listHandlersRunAt(site, actedAt).map((handler) => handler.range)]
  return listLinesOf({ diffLines: file.listDiffLines(), readLine: (line) => file.readLine(line) }, ranges.flatMap(linesIn))
}

const conditionOf = ({ from, usedAt, isRender }: EdgeFact): string | null =>
  isRender && from.root !== null ? conditionAt(from.file.listStatements(from.root), usedAt.start) : null

interface ActionNode {
  readonly id: string
  readonly entry: EntryFact
  readonly site: CodeSite
  readonly declaration: string
  readonly ranges: readonly SourceRange[]
  readonly through: readonly string[]
  readonly tracedLines: readonly TracedLine[]
  readonly handing: readonly EdgeFact[]
  readonly isDrawn: boolean
}

type Reach = Omit<ActionNode, "handing" | "isDrawn">

interface DrawnEdge {
  readonly fromId: string
  readonly toId: string
  readonly fact: EdgeFact
  readonly action: ActionNode | null
}

const listActionRanges = (fact: EntryFact): SourceRange[] =>
  fact.actedAt === null ? [] : [fact.actedAt, ...listHandlersRunAt(fact.site, fact.actedAt).map((handler) => handler.range)]

const actionIdOf = (site: CodeSite, event: string, { start }: SourceRange): string =>
  `${[codeSiteIdOf(site), event].join(ID_SEPARATOR)}${ACTION_LINE_MARK}${String(start.line)}`

const actionNameOf = ({ root }: CodeSite, event: string): string => [root?.name ?? TOP_LEVEL_NAME, event].join(MEMBER_SEPARATOR)

const eventOf = (site: CodeSite, heldAt: SourceRange, attribute: string): string => {
  const handlers = listHandlersRunAt(site, heldAt)
  return handlers.length > 0 ? handlers[0].name : attribute
}

const toSeedReaches = (entry: EntryFact, sameEntry: readonly EntryFact[]): Reach[] => {
  const { site, actedAt, end } = entry
  if (actedAt === null || site.root === null) return []
  const event = eventOf(site, actedAt, end?.event ?? DEFAULT_EVENT)
  return [
    {
      id: actionIdOf(site, event, actedAt),
      entry,
      site,
      declaration: actionNameOf(site, event),
      ranges: sameEntry.flatMap(listActionRanges),
      through: [],
      tracedLines: actionTracedLinesOf(entry),
    },
  ]
}

const findAttributeAt = ({ file }: CodeSite, range: SourceRange): AttributeSite | null => {
  const attribute = file.listSyntaxSitesAt(range).find((site) => site.kind === "attribute")
  return attribute?.kind === "attribute" ? attribute : null
}

const toHandedReach = (reach: Reach, { to, through }: EdgeFact, handedAt: SourceRange): Reach => {
  const attribute = findAttributeAt(to, handedAt)
  const heldAt = attribute?.range ?? handedAt
  const event = eventOf(to, heldAt, attribute?.attribute ?? DEFAULT_EVENT)
  const ranges = [heldAt, ...listHandlersRunAt(to, heldAt).map((handler) => handler.range)]
  return {
    id: actionIdOf(to, event, heldAt),
    entry: reach.entry,
    site: to,
    declaration: actionNameOf(to, event),
    ranges,
    through: [...reach.through, reach.declaration, ...through],
    tracedLines: listLinesOf({ diffLines: to.file.listDiffLines(), readLine: (line) => to.file.readLine(line) }, ranges.flatMap(linesIn)),
  }
}

const isLeaving = ({ site, ranges }: Reach, { from, usedAt }: EdgeFact): boolean =>
  codeSiteIdOf(site) === codeSiteIdOf(from) && ranges.some((range) => containsRange(range, usedAt))

const expandReach = (edges: readonly EdgeFact[], reach: Reach, followed: ReadonlySet<string>): ActionNode[] => {
  const leaving = edges.filter((edge) => isLeaving(reach, edge))
  const handing = leaving.filter((edge) => edge.handedAt !== null && edge.to.root !== null && !followed.has(codeSiteIdOf(edge.to)))
  const further = handing.flatMap((edge) =>
    edge.handedAt === null ? [] : expandReach(edges, toHandedReach(reach, edge, edge.handedAt), new Set([...followed, codeSiteIdOf(edge.to)])))
  return [{ ...reach, handing, isDrawn: handing.length === 0 || handing.length < leaving.length }, ...further]
}

const listActionNodes = (entries: readonly EntryFact[], facts: readonly EntryFact[], edges: readonly EdgeFact[]): ActionNode[] =>
  entries
    .flatMap((entry) => toSeedReaches(entry, facts.filter((fact) => entryPointIdOf(fact) === entryPointIdOf(entry))))
    .flatMap((seed) => expandReach(edges, seed, new Set([codeSiteIdOf(seed.site)])))

const drawEdge = (actions: readonly ActionNode[], fact: EdgeFact): DrawnEdge[] => {
  if (actions.some((action) => action.handing.includes(fact))) return []
  const toId = codeSiteIdOf(fact.to)
  const running = actions.filter((action) => action.isDrawn && isLeaving(action, fact))
  if (running.length === 0) return [{ fromId: codeSiteIdOf(fact.from), toId, fact: { ...fact, usedAt: fact.keptAt ?? fact.usedAt }, action: null }]
  return running.map((action) => ({ fromId: action.id, toId, fact, action }))
}

const drawnEdgeKeyOf = ({ fromId, toId }: DrawnEdge): string => [fromId, toId].join(EDGE_SEPARATOR)

const isSpanningLines = ({ start, end }: SourceRange): boolean => start.line < end.line

const isChangedOutside = (actions: readonly ActionNode[], site: CodeSite): boolean => {
  const ranges = actions
    .filter((action) => codeSiteIdOf(action.site) === codeSiteIdOf(site))
    .flatMap((action) => action.ranges)
    .filter(isSpanningLines)
  return changedLinesIn(site).some((lines) => ranges.every((range) => !containsLines(range, lines)))
}

const isChangedIn = ({ site, ranges }: ActionNode): boolean =>
  site.file.listDiffLines().some((lines) => ranges.some((range) => overlapsLines(range, lines)))

const isActionWhollyNew = ({ site, ranges }: ActionNode): boolean => {
  const newLines = joinAdjacentLines(site.file.listDiffLines())
  return ranges.every((range) => isWithinLines(linesOf(range), newLines))
}

const toActionDeclarationNode = (action: ActionNode): DeclarationNode => {
  const isChanged = isChangedIn(action)
  return {
    kind: "declaration",
    id: action.id,
    path: action.site.file.filePath,
    declaration: action.declaration,
    changeType: isChanged ? DIFF : RELATED,
    isAdded: isChanged && isActionWhollyNew(action),
    category: HANDLER_CATEGORY,
    label: null,
    description: null,
    tracedLines: [...action.tracedLines],
    events: [],
    data: [],
  }
}

const toTriggerEdges = (fact: EntryFact, actions: readonly ActionNode[]): JourneyEdge[] => {
  const acted = firstOfEach(actions.filter((action) => action.entry === fact && action.isDrawn), (action) => action.id)
  const targets = fact.actedAt === null || fact.site.root === null ? [{ id: codeSiteIdOf(fact.site), through: [] }] : acted
  return targets.map(({ id, through }) => ({
    from: entryPointIdOf(fact),
    to: id,
    kind: "trigger",
    certainty: "proven",
    through: [...through],
    condition: null,
  }))
}

const toEdge = ({ fromId, toId, fact, action }: DrawnEdge): JourneyEdge => ({
  from: fromId,
  to: toId,
  kind: fact.connection,
  certainty: fact.certainty,
  through: fact.through,
  condition: action === null ? conditionOf(fact) : null,
})

const listedNames = (names: readonly string[]): string =>
  names.length <= LISTED_NAME_LIMIT
    ? names.join(NAME_SEPARATOR)
    : `${names.slice(0, LISTED_NAME_LIMIT).join(NAME_SEPARATOR)} +${String(names.length - LISTED_NAME_LIMIT)} more`

export const generateJourneyFlowDiagram = (astGraphFiles: readonly BaseASTGraphFile[]): JourneyFlow | null => {
  const changed = astGraphFiles.flatMap(listChangedSites)
  if (changed.length === 0) return null
  const facts = traceJourney(astGraphFiles, changed)
  const entryFacts = facts.filter(isEntry)
  const entries = firstOfEach(entryFacts, entryPointIdOf)
  const edgeFacts = facts.filter(isEdge)
  const actions = listActionNodes(entries, entryFacts, edgeFacts)
  const edges = firstOfEach(edgeFacts.flatMap((fact) => drawEdge(actions, fact)), drawnEdgeKeyOf)
  const siteEdges = edges.filter((edge) => edge.action === null).map((edge) => edge.fact)
  const changedSites = firstOfEach(changed.map(({ site }) => site), codeSiteIdOf).filter((site) => isChangedOutside(actions, site))
  const changedIds = new Set(changedSites.map(codeSiteIdOf))
  const entrySites = entries.filter((entry) => entry.actedAt === null || entry.site.root === null).map((entry) => entry.site)
  const sites = firstOfEach([...changedSites, ...edges.map((edge) => edge.fact.to), ...siteEdges.map((edge) => edge.from), ...entrySites], codeSiteIdOf)
  const nodes = [
    ...sites.map((site) => toDeclarationNode(site, changedIds.has(codeSiteIdOf(site)), siteEdges, actions)),
    ...firstOfEach(actions.filter((action) => action.isDrawn), (action) => action.id).map(toActionDeclarationNode),
  ]
  const drawnIds = new Set(nodes.map((node) => node.id))
  const triggers = entries
    .map((entry) => ({ entry, edges: toTriggerEdges(entry, actions).filter((edge) => drawnIds.has(edge.to)) }))
    .filter(({ edges: leading }) => leading.length > 0)
  const changedNodes = nodes.filter((node) => node.changeType === DIFF)
  if (changedNodes.length === 0) return null
  return {
    id: `${FLOW_ID_PREFIX}${changedNodes[0].id}`,
    title: listedNames(changedNodes.map((node) => node.declaration)),
    nodes: [...triggers.map(({ entry }) => toEntryPointNode(entry)), ...nodes],
    edges: [...triggers.flatMap(({ edges: leading }) => leading), ...edges.map(toEdge)],
  }
}
