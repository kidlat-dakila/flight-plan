import type { ArgumentSite, AttributeSite, ASTGraphFile, Encapsulation, SourceRange, SymbolReference, SyntaxSite } from "@/ast-graph"
import { containsRange, isSameRange, linesOf, overlapsLines } from "@/ast-graph/source-range"
import { firstOfEach } from "@/shared/first-of-each"
import type { ChangeType, TracedEvent, TracedName } from "@flightplan/configurations"
import { isHandlerAttribute, isListener, listenerTargetOf } from "./listeners"
import { findDeclarationAt } from "./traced-lines"

const MEMBER_SEPARATOR = "."
const KEY_SEPARATOR = ":"
const UNNAMED_EVENT = "event"
const DIFF: ChangeType = "diff"
const RELATED: ChangeType = "related"
const UNCHANGED: ChangeType = "none"

const isAttribute = (site: SyntaxSite): site is AttributeSite => site.kind === "attribute"

const isListenerArgument = (site: SyntaxSite): site is ArgumentSite => site.kind === "argument" && isListener(site)

const listNestedEncapsulations = (holder: Encapsulation): Encapsulation[] =>
  holder.encapsulations.flatMap((nested) => [nested, ...listNestedEncapsulations(nested)])

const isHandedOver = (file: ASTGraphFile, attribute: AttributeSite, written: SourceRange): boolean =>
  file
    .listSyntaxSitesAt(written)
    .filter((around) => containsRange(attribute.range, around.range) && !isSameRange(around.range, written))
    .every((around) => around.kind !== "argument")

const holdsFunctionWrittenInPlace = (file: ASTGraphFile, attribute: AttributeSite): boolean =>
  file
    .listSyntaxSitesIn(attribute.range)
    .some((site) => site.kind === "function" && isHandedOver(file, attribute, site.range))

const listDeclaredFunctions = (file: ASTGraphFile, root: Encapsulation): Encapsulation[] =>
  listNestedEncapsulations(root).filter((nested) => file.findEncapsulationDeclaration(nested) !== null)

const holdsDeclaredFunction = (file: ASTGraphFile, root: Encapsulation, attribute: AttributeSite): boolean =>
  listDeclaredFunctions(file, root).some((nested) =>
    file.traceEncapsulationUsage(nested).some((usage) => containsRange(attribute.range, usage.range) && isHandedOver(file, attribute, usage.range)))

const isCallbackAttribute = (file: ASTGraphFile, root: Encapsulation, attribute: AttributeSite): boolean =>
  isHandlerAttribute(attribute.attribute) || holdsFunctionWrittenInPlace(file, attribute) || holdsDeclaredFunction(file, root, attribute)

const isInDiff = (file: ASTGraphFile, range: SourceRange): boolean => file.listDiffLines().some((lines) => overlapsLines(range, lines))

const changeTypeOf = (file: ASTGraphFile, range: SourceRange, isLinkedToChange: boolean): ChangeType => {
  if (isInDiff(file, range)) return DIFF
  return isLinkedToChange ? RELATED : UNCHANGED
}

const listCallbackAttributes = (file: ASTGraphFile, root: Encapsulation): AttributeSite[] =>
  file.listSyntaxSitesIn(root.range).filter(isAttribute).filter((attribute) => isCallbackAttribute(file, root, attribute))

const toTracedName = (file: ASTGraphFile, name: string, range: SourceRange, isLinkedToChange: boolean): TracedName => ({
  name,
  changeType: changeTypeOf(file, range, isLinkedToChange),
  reference: linesOf(range),
})

export const listHandedFunctionRanges = (file: ASTGraphFile, root: Encapsulation, holder: SourceRange): SourceRange[] =>
  listDeclaredFunctions(file, root)
    .filter((declared) => file.traceEncapsulationUsage(declared).some((usage) => containsRange(holder, usage.range)))
    .map((declared) => declared.range)

const tracedNameKeyOf = ({ name, reference: [startLine, endLine] }: TracedName): string => [name, startLine, endLine].join(KEY_SEPARATOR)

const inSourceOrder = <Named extends TracedName>(names: readonly Named[]): Named[] =>
  [...firstOfEach(names, tracedNameKeyOf)].sort((one, two) => one.reference[0] - two.reference[0])

export type HandlerNodeFinder = (heldAt: SourceRange) => string | null

const toTracedEvent = (file: ASTGraphFile, root: Encapsulation, name: string, heldAt: SourceRange, findHandlerNode: HandlerNodeFinder): TracedEvent => ({
  ...toTracedName(file, name, heldAt, listHandedFunctionRanges(file, root, heldAt).some((handed) => isInDiff(file, handed))),
  nodeId: findHandlerNode(heldAt),
})

const attributeEventNameOf = ({ element, attribute, event }: AttributeSite): string => [element, event ?? attribute].join(MEMBER_SEPARATOR)

const listenedEventNameOf = (site: ArgumentSite): string => [listenerTargetOf(site), site.literal ?? UNNAMED_EVENT].join(MEMBER_SEPARATOR)

export const listEventRanges = (file: ASTGraphFile, root: Encapsulation): SourceRange[] => [
  ...listCallbackAttributes(file, root).map((attribute) => attribute.range),
  ...file.listSyntaxSitesIn(root.range).filter(isListenerArgument).map((site) => site.range),
]

export const listTracedEvents = (file: ASTGraphFile, root: Encapsulation, findHandlerNode: HandlerNodeFinder): TracedEvent[] =>
  inSourceOrder([
    ...listCallbackAttributes(file, root).map((attribute) => toTracedEvent(file, root, attributeEventNameOf(attribute), attribute.range, findHandlerNode)),
    ...file
      .listSyntaxSitesIn(root.range)
      .filter(isListenerArgument)
      .map((site) => toTracedEvent(file, root, listenedEventNameOf(site), site.range, findHandlerNode)),
  ])

const isWithinAny = (ranges: readonly SourceRange[], range: SourceRange): boolean => ranges.some((holder) => containsRange(holder, range))

const rangesOfKind = (sites: readonly SyntaxSite[], kind: SyntaxSite["kind"]): SourceRange[] =>
  sites.filter((site) => site.kind === kind).map((site) => site.range)

const isDeclaredWithin = (file: ASTGraphFile, ranges: readonly SourceRange[], reference: SymbolReference): boolean => {
  const declared = file.findDeclarationRange(reference)
  return declared !== null && isWithinAny(ranges, declared)
}

const declarationRangesIn = (file: ASTGraphFile, root: Encapsulation, reference: SymbolReference): SourceRange[] => {
  const declared = file.findDeclarationRange(reference)
  if (declared === null || !containsRange(root.range, declared)) return []
  return [findDeclarationAt(file.listStatements(root), declared.start)?.range ?? declared]
}

export const listDataReads = (file: ASTGraphFile, root: Encapsulation): SymbolReference[] => {
  const sites = file.listSyntaxSitesIn(root.range)
  const markup = rangesOfKind(sites, "markup")
  const elementNames = rangesOfKind(sites, "element")
  const callees = rangesOfKind(sites, "callee")
  const callbacks = listCallbackAttributes(file, root).map((attribute) => attribute.range)
  return file
    .listValueReferencesIn(root.range)
    .filter(({ range }) => isWithinAny(markup, range))
    .filter(({ range }) => !isWithinAny(elementNames, range) && !isWithinAny(callbacks, range))
    .filter(({ range }) => callees.every((callee) => !isSameRange(callee, range)))
    .filter((reference) => !isDeclaredWithin(file, markup, reference))
}

const isLinkedToChange = (file: ASTGraphFile, root: Encapsulation, reference: SymbolReference, changedReads: readonly SourceRange[]): boolean =>
  changedReads.some((read) => isSameRange(read, reference.range)) || declarationRangesIn(file, root, reference).some((declared) => isInDiff(file, declared))

export const listTracedData = (file: ASTGraphFile, root: Encapsulation, changedReads: readonly SourceRange[]): TracedName[] =>
  inSourceOrder(
    listDataReads(file, root).map((reference) => toTracedName(file, reference.name, reference.range, isLinkedToChange(file, root, reference, changedReads))),
  )
