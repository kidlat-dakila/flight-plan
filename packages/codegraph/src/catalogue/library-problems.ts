import { listPatternKeys, patternKeyOf } from "./pattern-keys"
import type {
  CallPattern,
  CatalogueLibrary,
  CataloguePattern,
  ClassMember,
  ClassPattern,
  DecoratorPattern,
  DirectivePattern,
  ElementPattern,
  FactoryPattern,
  FileExport,
  FilePattern,
  MethodPattern,
  SlotRuns,
} from "./types"

interface PatternPlace {
  readonly specifiers: readonly string[]
  readonly isUnderPrefix: boolean
}

const RUNS_WITH_A_PATH: ReadonlySet<SlotRuns> = new Set<SlotRuns>(["route", "page"])
const RUNS_WITH_A_METHOD: SlotRuns = "route"

const isBlank = (text: string): boolean => text.trim() === ""

const saysNothing = (pattern: CallPattern): boolean =>
  pattern.slots.length === 0
  && pattern.makes === undefined
  && pattern.pathAt === undefined
  && pattern.prefixAt === undefined
  && pattern.eventAt === undefined
  && pattern.provides === undefined
  && pattern.reads === undefined

const hasPathSlot = (pattern: CallPattern | FactoryPattern): boolean => (pattern.slots ?? []).some((slot) => RUNS_WITH_A_PATH.has(slot.runs))

const hasRouteSlot = (pattern: CallPattern): boolean => pattern.slots.some((slot) => slot.runs === RUNS_WITH_A_METHOD)

const CALLED_VALUE = "called"

const namesNoMethod = (pattern: CallPattern | DecoratorPattern): boolean => pattern.method === undefined && pattern.methodAt === undefined

const lacksPath = (pattern: CallPattern | DecoratorPattern, place: PatternPlace): boolean =>
  pattern.pathAt === undefined && !place.isUnderPrefix

const sourceProblems = (from: string | undefined, place: PatternPlace): string[] =>
  from !== undefined && !place.specifiers.includes(from) ? [`is imported from ${from}, which is no specifier of its library`] : []

const callProblems = (pattern: CallPattern, place: PatternPlace): string[] => [
  ...(isBlank(pattern.name) ? ["has no name"] : []),
  ...sourceProblems(pattern.from, place),
  ...(saysNothing(pattern) ? ["says nothing: it has no slot, makes nothing and names no path or event"] : []),
  ...(hasPathSlot(pattern) && lacksPath(pattern, place) ? ["has a route or a page slot and no pathAt"] : []),
  ...(hasRouteSlot(pattern) && namesNoMethod(pattern) ? ["has a route slot and neither method nor methodAt"] : []),
]

const factorySaysNothing = (pattern: FactoryPattern): boolean =>
  pattern.methods.length === 0
  && pattern.makes === undefined
  && pattern.provides === undefined
  && pattern.called === undefined
  && (pattern.slots ?? []).length === 0

const factoryProblems = (pattern: FactoryPattern, place: PatternPlace): string[] => [
  ...(isBlank(pattern.name) ? ["has no name"] : []),
  ...sourceProblems(pattern.from, place),
  ...(factorySaysNothing(pattern) ? ["has no method and makes nothing"] : []),
  ...(hasPathSlot(pattern) ? ["has a route or a page slot, which a factory cannot give a path"] : []),
]

const memberProblems = (member: ClassMember): string[] =>
  member.runs === RUNS_WITH_A_METHOD && member.method === undefined ? [`has the route member ${member.name} with no method`] : []

const classProblems = (pattern: ClassPattern, place: PatternPlace): string[] => [
  ...(isBlank(pattern.name) ? ["has no name"] : []),
  ...sourceProblems(pattern.from, place),
  ...(pattern.members.length === 0 && pattern.methods.length === 0 && pattern.makes === undefined
    ? ["says nothing: it has no member and no method, and makes nothing"]
    : []),
  ...pattern.members.flatMap(memberProblems),
]

const runsWithAPath = (pattern: DecoratorPattern): boolean => pattern.runs !== undefined && RUNS_WITH_A_PATH.has(pattern.runs)

const decoratorProblems = (pattern: DecoratorPattern, place: PatternPlace): string[] => [
  ...(isBlank(pattern.name) ? ["has no name"] : []),
  ...sourceProblems(pattern.from, place),
  ...(pattern.runs === undefined && pattern.makes === undefined && pattern.prefixAt === undefined && (pattern.slots ?? []).length === 0 && namesNoMethod(pattern)
    ? ["says nothing: it runs nothing, makes nothing, has no slot and names no method"]
    : []),
  ...(runsWithAPath(pattern) && lacksPath(pattern, place) ? ["runs a route or a page and has no pathAt"] : []),
  ...(pattern.runs === RUNS_WITH_A_METHOD && namesNoMethod(pattern) ? ["runs a route and has neither method nor methodAt"] : []),
]

const elementSaysNothing = (pattern: ElementPattern): boolean =>
  pattern.slots.length === 0 && pattern.makes === undefined && pattern.provides === undefined && pattern.reads === undefined

const elementProblems = (pattern: ElementPattern, place: PatternPlace): string[] => [
  ...(isBlank(pattern.name) ? ["has no name"] : []),
  ...sourceProblems(pattern.from, place),
  ...(elementSaysNothing(pattern) ? ["says nothing: it has no slot, makes nothing and neither provides nor reads a value"] : []),
]

const exportProblems = (fileExport: FileExport): string[] =>
  fileExport.runs === RUNS_WITH_A_METHOD && fileExport.method === undefined
    ? [`exports the route ${fileExport.name} with no method`]
    : []

const fileProblems = (pattern: FilePattern): string[] => [
  ...(isBlank(pattern.glob) ? ["has no glob"] : []),
  ...(pattern.exports.length === 0 && pattern.isIgnored !== true ? ["names no export and is not ignored"] : []),
  ...pattern.exports.flatMap(exportProblems),
]

const directiveProblems = (pattern: DirectivePattern): string[] => (isBlank(pattern.text) ? ["has no text"] : [])

const ownProblems = (pattern: CataloguePattern, place: PatternPlace): string[] => {
  if (pattern.kind === "call") return callProblems(pattern, place)
  if (pattern.kind === "factory") return factoryProblems(pattern, place)
  if (pattern.kind === "decorator") return decoratorProblems(pattern, place)
  if (pattern.kind === "element") return elementProblems(pattern, place)
  if (pattern.kind === "class") return classProblems(pattern, place)
  if (pattern.kind === "file") return fileProblems(pattern)
  return directiveProblems(pattern)
}

const placeBelow = (factory: FactoryPattern, place: PatternPlace): PatternPlace => ({
  specifiers: place.specifiers,
  isUnderPrefix: place.isUnderPrefix || factory.prefixAt !== undefined,
})

const calledMethodsOf = (pattern: CataloguePattern): readonly MethodPattern[] =>
  pattern.kind === "factory" ? (pattern.called?.methods ?? []) : []

const methodsOf = (pattern: CataloguePattern): readonly MethodPattern[] =>
  pattern.kind === "factory" || pattern.kind === "class" ? pattern.methods : []

const placeOfMethods = (pattern: CataloguePattern, place: PatternPlace): PatternPlace =>
  pattern.kind === "factory" ? placeBelow(pattern, place) : place

function patternProblems(pattern: CataloguePattern, place: PatternPlace): string[] {
  const methodProblems = methodsOf(pattern).flatMap((method) => patternProblems(method, placeOfMethods(pattern, place)))
  const calledProblems = calledMethodsOf(pattern)
    .flatMap((method) => patternProblems(method, place))
    .map((problem) => `${CALLED_VALUE} ${problem}`)
  return [...ownProblems(pattern, place), ...methodProblems, ...calledProblems].map((problem) => `${patternKeyOf(pattern)} ${problem}`)
}

const repeated = (texts: readonly string[]): string[] => [...new Set(texts.filter((text, index) => texts.indexOf(text) !== index))]

const lacksDocumentedVersion = (library: CatalogueLibrary): boolean =>
  library.specifiers.length > 0 && isBlank(library.documentedVersion ?? "")

export const listLibraryProblems = (library: CatalogueLibrary): string[] => [
  ...(isBlank(library.name) ? ["has no name"] : []),
  ...(isBlank(library.category) ? ["has no category"] : []),
  ...(lacksDocumentedVersion(library) ? ["does not say which version of the documentation it was written from"] : []),
  ...(library.patterns.length === 0 ? ["has no pattern"] : []),
  ...repeated(library.specifiers).map((specifier) => `${specifier} is listed more than once`),
  ...repeated(listPatternKeys(library)).map((key) => `${key} is listed more than once`),
  ...library.patterns.flatMap((pattern) => patternProblems(pattern, { specifiers: library.specifiers, isUnderPrefix: false })),
]

const SPECIFIER_OF_LANGUAGE = " of "

const specifiersOf = (libraries: readonly CatalogueLibrary[]): string[] =>
  libraries.flatMap((library) => [...new Set(library.specifiers)].map((specifier) => `${specifier}${SPECIFIER_OF_LANGUAGE}${library.language}`))

export const listCatalogueProblems = (libraries: readonly CatalogueLibrary[]): string[] => [
  ...repeated(libraries.map((library) => library.name)).map((name) => `${name} is the name of more than one library file`),
  ...repeated(specifiersOf(libraries)).map((specifier) => `${specifier} is in more than one library file`),
  ...libraries.flatMap((library) => listLibraryProblems(library).map((problem) => `${library.name}: ${problem}`)),
]
