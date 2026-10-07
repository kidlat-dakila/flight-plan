import type { BaseASTGraphFile, Encapsulation, LineRange, Position, SourceRange, Statement } from "@/ast-graph"
import { containsRange, joinAdjacentLines, linesOf, overlapsLines } from "@/ast-graph/source-range"
import { firstOfEach } from "@/shared/first-of-each"
import type { DeclarationNode, EntryPointNode, FrameLine, JourneyEdge, JourneyFlow, NodeCategory } from "@flightplan/configurations"
import { buildFrameLines, conditionAt, findMarkupAt, listLinesOf, type FrameSource } from "./call-stack"
import { codeSiteIdOf, TOP_LEVEL_NAME, traceJourney, type ChangedSite, type CodeSite, type EdgeFact, type EntryFact, type JourneyFact } from "./trace"

const DEFAULT_CATEGORY: NodeCategory = "logic"
const FLOW_ID_PREFIX = "journey:"
const ENTRY_POINT_ID_PREFIX = "entry:"
const ID_SEPARATOR = ":"
const EDGE_SEPARATOR = ">"
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

const edgeKeyOf = ({ from, to }: EdgeFact): string => [codeSiteIdOf(from), codeSiteIdOf(to)].join(EDGE_SEPARATOR)

const changedLinesIn = ({ file, root }: CodeSite): LineRange[] =>
  root === null ? listChangedTopLevelLines(file) : file.listDiffLocations().filter((location) => location.rootEncapsulation === root).map((location) => location.diffLoC)

const frameSourceOf = ({ file, root }: CodeSite, statements: readonly Statement[]): FrameSource => ({
  statements: root === null ? statements : file.listStatements(root),
  diffLines: file.listDiffLines(),
  readLine: (line) => file.readLine(line),
})

const frameLinesOf = (site: CodeSite, isChanged: boolean, leavingAt: readonly Position[]): FrameLine[] => {
  const lines = changedLinesIn(site)
  const changedTopLevel = site.file.listTopLevelStatements().filter((statement) => lines.some((range) => overlapsLines(statement.range, range)))
  const targets = isChanged || site.root === null ? { positions: [], lines } : { positions: leavingAt, lines: [] }
  return buildFrameLines(frameSourceOf(site, changedTopLevel), targets)
}

const frameLinesTo = ({ from, usedAt }: EdgeFact): FrameLine[] =>
  from.root === null ? [] : buildFrameLines(frameSourceOf(from, []), { positions: [usedAt.start], lines: [] })

const isWithinLines = ([startLine, endLine]: LineRange, ranges: readonly LineRange[]): boolean =>
  ranges.some(([rangeStart, rangeEnd]) => rangeStart <= startLine && endLine <= rangeEnd)

const isWhollyNew = ({ file, root }: CodeSite): boolean => {
  const newLines = joinAdjacentLines(file.listDiffLines())
  const ownLines = root === null ? file.listTopLevelStatements().map((statement) => linesOf(statement.range)) : [linesOf(root.range)]
  return ownLines.length > 0 && ownLines.every((lines) => isWithinLines(lines, newLines))
}

const toDeclarationNode = (site: CodeSite, isChanged: boolean, edges: readonly EdgeFact[]): DeclarationNode => {
  const id = codeSiteIdOf(site)
  const leavingAt = edges.filter((edge) => codeSiteIdOf(edge.from) === id).map((edge) => edge.usedAt.start)
  return {
    kind: "declaration",
    id,
    path: site.file.filePath,
    declaration: site.root?.name ?? TOP_LEVEL_NAME,
    isChanged,
    isAdded: isChanged && isWhollyNew(site),
    category: DEFAULT_CATEGORY,
    label: null,
    description: null,
    frameLines: frameLinesOf(site, isChanged, leavingAt),
  }
}

const toEntryPointNode = (fact: EntryFact): EntryPointNode => ({
  kind: "entry-point",
  id: entryPointIdOf(fact),
  trigger: fact.entry.trigger,
  label: fact.entry.label,
  description: null,
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

const actionFrameLinesOf = ({ site, actedAt }: EntryFact): FrameLine[] => {
  const { file, root } = site
  if (actedAt === null || root === null) return []
  const element = findMarkupAt(file.listStatements(root), actedAt.start)
  const ranges = [...(element === null ? [actedAt] : [element.range]), ...listHandlersRunAt(site, actedAt).map((handler) => handler.range)]
  return listLinesOf({ diffLines: file.listDiffLines(), readLine: (line) => file.readLine(line) }, ranges.flatMap(linesIn))
}

const toTriggerEdge = (fact: EntryFact): JourneyEdge => ({
  from: entryPointIdOf(fact),
  to: codeSiteIdOf(fact.site),
  kind: "trigger",
  certainty: "proven",
  through: [],
  condition: null,
  frameLines: actionFrameLinesOf(fact),
})

const conditionOf = ({ from, usedAt, isRender }: EdgeFact): string | null =>
  isRender && from.root !== null ? conditionAt(from.file.listStatements(from.root), usedAt.start) : null

const toEdge = (fact: EdgeFact): JourneyEdge => ({
  from: codeSiteIdOf(fact.from),
  to: codeSiteIdOf(fact.to),
  kind: fact.connection,
  certainty: fact.certainty,
  through: fact.through,
  condition: conditionOf(fact),
  frameLines: frameLinesTo(fact),
})

const listedNames = (names: readonly string[]): string =>
  names.length <= LISTED_NAME_LIMIT
    ? names.join(NAME_SEPARATOR)
    : `${names.slice(0, LISTED_NAME_LIMIT).join(NAME_SEPARATOR)} +${String(names.length - LISTED_NAME_LIMIT)} more`

export const generateJourneyFlowDiagram = (astGraphFiles: readonly BaseASTGraphFile[]): JourneyFlow | null => {
  const changed = astGraphFiles.flatMap(listChangedSites)
  if (changed.length === 0) return null
  const facts = traceJourney(astGraphFiles, changed)
  const edges = firstOfEach(facts.filter(isEdge), edgeKeyOf)
  const entries = firstOfEach(facts.filter(isEntry), entryPointIdOf)
  const changedSites = firstOfEach(changed.map(({ site }) => site), codeSiteIdOf)
  const changedIds = new Set(changedSites.map(codeSiteIdOf))
  const sites = firstOfEach([...changedSites, ...edges.flatMap((edge) => [edge.to, edge.from]), ...entries.map((entry) => entry.site)], codeSiteIdOf)
  const nodes = sites.map((site) => toDeclarationNode(site, changedIds.has(codeSiteIdOf(site)), edges))
  return {
    id: `${FLOW_ID_PREFIX}${codeSiteIdOf(changedSites[0])}`,
    title: listedNames(nodes.filter((node) => node.isChanged).map((node) => node.declaration)),
    nodes: [...entries.map(toEntryPointNode), ...nodes],
    edges: [...entries.map(toTriggerEdge), ...edges.map(toEdge)],
  }
}
