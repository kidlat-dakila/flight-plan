import type { ArgumentSite, AttributeSite, BaseASTGraphFile, Encapsulation, SourceRange, SymbolReference, SyntaxSite } from "@/ast-graph"
import { containsRange, isSameRange, linesOf, overlapsLines } from "@/ast-graph/source-range"
import { firstOfEach } from "@/shared/first-of-each"
import type { ChangeType, TracedEvent, TracedName } from "@flightplan/configurations"
import { findDeclarationAt } from "./traced-lines"
import { isHandlerAttribute, isListener, listenerTargetOf } from "./usage-role"

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

const isHandedOver = (file: BaseASTGraphFile, attribute: AttributeSite, written: SourceRange): boolean =>
  file
    .listSyntaxSitesAt(written)
    .filter((around) => containsRange(attribute.range, around.range) && !isSameRange(around.range, written))
    .every((around) => around.kind !== "argument")

const holdsFunctionWrittenInPlace = (file: BaseASTGraphFile, attribute: AttributeSite): boolean =>
  file
    .listSyntaxSitesIn(attribute.range)
    .some((site) => site.kind === "function" && isHandedOver(file, attribute, site.range))

const listDeclaredFunctions = (file: BaseASTGraphFile, root: Encapsulation): Encapsulation[] =>
  listNestedEncapsulations(root).filter((nested) => file.findEncapsulationDeclaration(nested) !== null)

const holdsDeclaredFunction = (file: BaseASTGraphFile, root: Encapsulation, attribute: AttributeSite): boolean =>
  listDeclaredFunctions(file, root).some((nested) =>
    file.traceEncapsulationUsage(nested).some((usage) => containsRange(attribute.range, usage.range) && isHandedOver(file, attribute, usage.range)))

const isCallbackAttribute = (file: BaseASTGraphFile, root: Encapsulation, attribute: AttributeSite): boolean =>
  isHandlerAttribute(attribute.attribute) || holdsFunctionWrittenInPlace(file, attribute) || holdsDeclaredFunction(file, root, attribute)

const isInDiff = (file: BaseASTGraphFile, range: SourceRange): boolean => file.listDiffLines().some((lines) => overlapsLines(range, lines))

const changeTypeOf = (file: BaseASTGraphFile, range: SourceRange, linked: readonly SourceRange[]): ChangeType => {
  if (isInDiff(file, range)) return DIFF
  return linked.some((link) => isInDiff(file, link)) ? RELATED : UNCHANGED
}

const listCallbackAttributes = (file: BaseASTGraphFile, root: Encapsulation): AttributeSite[] =>
  file.listSyntaxSitesIn(root.range).filter(isAttribute).filter((attribute) => isCallbackAttribute(file, root, attribute))

const toTracedName = (file: BaseASTGraphFile, name: string, range: SourceRange, linked: readonly SourceRange[]): TracedName => ({
  name,
  changeType: changeTypeOf(file, range, linked),
  reference: linesOf(range),
})

const handedFunctionRangesIn = (file: BaseASTGraphFile, root: Encapsulation, holder: SourceRange): SourceRange[] =>
  listDeclaredFunctions(file, root)
    .filter((declared) => file.traceEncapsulationUsage(declared).some((usage) => containsRange(holder, usage.range)))
    .map((declared) => declared.range)

const tracedNameKeyOf = ({ name, reference: [startLine, endLine] }: TracedName): string => [name, startLine, endLine].join(KEY_SEPARATOR)

const inSourceOrder = <Named extends TracedName>(names: readonly Named[]): Named[] =>
  [...firstOfEach(names, tracedNameKeyOf)].sort((one, two) => one.reference[0] - two.reference[0])

export type HandlerNodeFinder = (heldAt: SourceRange) => string | null

const toTracedEvent = (file: BaseASTGraphFile, root: Encapsulation, name: string, heldAt: SourceRange, findHandlerNode: HandlerNodeFinder): TracedEvent => ({
  ...toTracedName(file, name, heldAt, handedFunctionRangesIn(file, root, heldAt)),
  nodeId: findHandlerNode(heldAt),
})

const attributeEventNameOf = ({ element, attribute }: AttributeSite): string => [element, attribute].join(MEMBER_SEPARATOR)

const listenedEventNameOf = (site: ArgumentSite): string => [listenerTargetOf(site), site.literal ?? UNNAMED_EVENT].join(MEMBER_SEPARATOR)

export const listTracedEvents = (file: BaseASTGraphFile, root: Encapsulation, findHandlerNode: HandlerNodeFinder): TracedEvent[] =>
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

const isDeclaredWithin = (file: BaseASTGraphFile, ranges: readonly SourceRange[], reference: SymbolReference): boolean => {
  const declared = file.findDeclarationRange(reference)
  return declared !== null && isWithinAny(ranges, declared)
}

const declarationRangesIn = (file: BaseASTGraphFile, root: Encapsulation, reference: SymbolReference): SourceRange[] => {
  const declared = file.findDeclarationRange(reference)
  if (declared === null || !containsRange(root.range, declared)) return []
  return [findDeclarationAt(file.listStatements(root), declared.start)?.range ?? declared]
}

export const listTracedData = (file: BaseASTGraphFile, root: Encapsulation): TracedName[] => {
  const sites = file.listSyntaxSitesIn(root.range)
  const markup = rangesOfKind(sites, "markup")
  const elementNames = rangesOfKind(sites, "element")
  const callees = rangesOfKind(sites, "callee")
  const callbacks = listCallbackAttributes(file, root).map((attribute) => attribute.range)
  return inSourceOrder(
    file
      .listValueReferencesIn(root.range)
      .filter(({ range }) => isWithinAny(markup, range))
      .filter(({ range }) => !isWithinAny(elementNames, range) && !isWithinAny(callbacks, range))
      .filter(({ range }) => callees.every((callee) => !isSameRange(callee, range)))
      .filter((reference) => !isDeclaredWithin(file, markup, reference))
      .map((reference) => toTracedName(file, reference.name, reference.range, declarationRangesIn(file, root, reference))),
  )
}
