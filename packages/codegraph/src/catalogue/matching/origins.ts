import { NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import type { SyntaxNode } from "@/ast-graph/parser"
import { patternKeyOf } from "@/catalogue/pattern-keys"
import type { CalledValue, CallPattern, CatalogueLibrary, CataloguePattern, ClassPattern, FactoryPattern, MethodPattern, SlotPosition } from "@/catalogue/types"
import { nodesAt } from "./places"
import type { Binding, SyntaxReader } from "./syntax-reader"

export interface ExportOrigin {
  readonly kind: "export"
  readonly specifier: string
  readonly paths: readonly (readonly string[])[]
}

export interface MadeValue {
  readonly kind: "made"
  readonly library: CatalogueLibrary
  readonly specifier: string
  readonly key: string
  readonly methods: readonly MethodPattern[]
  readonly called: CalledValue | null
  readonly memberPath: readonly string[]
  readonly prefixAt: SlotPosition | null
  readonly prefix: string | null
}

export type Origin = ExportOrigin | MadeValue

export interface ExportedPattern {
  readonly library: CatalogueLibrary
  readonly specifier: string
  readonly pattern: CataloguePattern
}

export interface OriginContext {
  readonly reader: SyntaxReader
  readonly libraries: readonly CatalogueLibrary[]
}

const DEFAULT_EXPORT = "default"
const MEMBER_SEPARATOR = "."
const KEY_SEPARATOR = ">"
const CALLED_VALUE = "called"
const WILDCARD = "*"
const DEEPEST_ORIGIN = 24
const START_DEPTH = 0
const RUNNING_IN_PLACE = "in-place"
const CALLED_KINDS: ReadonlySet<MethodPattern["kind"]> = new Set<MethodPattern["kind"]>(["call"])
const NAMED_KINDS: ReadonlySet<CataloguePattern["kind"]> = new Set<CataloguePattern["kind"]>(["call", "factory", "decorator", "element", "class", "assignment"])

type NamedPattern = MethodPattern | ClassPattern

const isNamed = (pattern: CataloguePattern): pattern is NamedPattern => NAMED_KINDS.has(pattern.kind)

const escaped = (text: string): string => text.replace(/[.+?^${}()|[\]\\]/g, "\\$&")

const fitsSegment = (wanted: string, written: string): boolean =>
  wanted === written || (wanted.includes(WILDCARD) && new RegExp(`^${wanted.split(WILDCARD).map(escaped).join(".*")}$`).test(written))

export const fitsMemberPath = (patternName: string, memberPath: readonly string[]): boolean => {
  const wanted = patternName.split(MEMBER_SEPARATOR)
  const written = memberPath.slice(-wanted.length)
  return written.length === wanted.length && wanted.every((segment, index) => fitsSegment(segment, written[index]))
}

const pathsOfImport = (importedName: string): string[][] => {
  if (importedName === NAMESPACE_IMPORT) return [[]]
  return importedName === DEFAULT_EXPORT ? [[DEFAULT_EXPORT], []] : [[importedName]]
}

const isOfLanguage = (library: CatalogueLibrary, { reader }: OriginContext): boolean => library.language === reader.language

interface ExportedName {
  readonly specifier: string
  readonly name: string
}

const deeperModules = (specifier: string, path: readonly string[]): ExportedName[] =>
  path.slice(0, -1).map((_, index) => ({
    specifier: [specifier, ...path.slice(0, index + 1)].join(MEMBER_SEPARATOR),
    name: path.slice(index + 1).join(MEMBER_SEPARATOR),
  }))

const exportedNamesOf = ({ specifier, paths }: ExportOrigin): ExportedName[] =>
  paths.flatMap((path) => [...(path.length === 0 ? [] : [{ specifier, name: path.join(MEMBER_SEPARATOR) }]), ...deeperModules(specifier, path)])

const fitsExportName = (wanted: string, written: string): boolean => {
  const wantedSegments = wanted.split(MEMBER_SEPARATOR)
  const writtenSegments = written.split(MEMBER_SEPARATOR)
  return wantedSegments.length === writtenSegments.length && wantedSegments.every((segment, index) => fitsSegment(segment, writtenSegments[index]))
}

const isExportedAs = (pattern: NamedPattern, { specifier, name }: ExportedName): boolean =>
  fitsExportName(pattern.name, name) && (pattern.from === undefined || pattern.from === specifier)

export const listExportedPatterns = (origin: ExportOrigin, context: OriginContext): ExportedPattern[] =>
  exportedNamesOf(origin).flatMap((exported) =>
    context.libraries
      .filter((library) => isOfLanguage(library, context) && library.specifiers.includes(exported.specifier))
      .flatMap((library) =>
        library.patterns.filter((pattern) => isNamed(pattern) && isExportedAs(pattern, exported)).map((pattern) => ({ library, specifier: exported.specifier, pattern })),
      ),
  )

export const keyBelow = (key: string, memberKey: string): string => `${key}${KEY_SEPARATOR}${memberKey}`

export const calledKeyOf = (made: MadeValue): string => keyBelow(made.key, CALLED_VALUE)

const PATH_SEPARATOR = "/"

export const joinPrefixes = (outer: string | null, inner: string | null): string | null => {
  if (outer === null || inner === null) return inner ?? outer
  const parts = [outer, inner].flatMap((part) => part.split(PATH_SEPARATOR)).filter((part) => part !== "")
  return `${PATH_SEPARATOR}${parts.join(PATH_SEPARATOR)}`
}

const madeBy = (pattern: FactoryPattern | ClassPattern, key: string, library: CatalogueLibrary, specifier: string, prefix: string | null = null): MadeValue => ({
  kind: "made",
  library,
  specifier,
  key,
  methods: pattern.methods,
  called: pattern.kind === "factory" ? (pattern.called ?? null) : null,
  memberPath: [],
  prefixAt: pattern.kind === "factory" ? (pattern.prefixAt ?? null) : null,
  prefix,
})

const isMaking = (pattern: CataloguePattern): pattern is FactoryPattern | ClassPattern => pattern.kind === "factory" || pattern.kind === "class"

export const listMethods = (made: MadeValue, kinds: ReadonlySet<MethodPattern["kind"]>): MethodPattern[] =>
  made.memberPath.length === 0 ? [] : made.methods.filter((method) => kinds.has(method.kind) && fitsMemberPath(method.name, made.memberPath))

const rested = (made: MadeValue): MadeValue => ({ ...made, memberPath: [] })

const madeByCalling = (made: MadeValue): MadeValue => {
  const factory = made.methods.find((method): method is FactoryPattern => method.kind === "factory" && fitsMemberPath(method.name, made.memberPath))
  if (made.memberPath.length > 0) {
    return factory === undefined ? rested(made) : madeBy(factory, keyBelow(made.key, patternKeyOf(factory)), made.library, made.specifier, made.prefix)
  }
  if (made.called === null) return made
  return { ...made, key: calledKeyOf(made), methods: made.called.methods ?? [], called: null }
}

const madeByExport = (origin: ExportOrigin, kind: "factory" | "class", context: OriginContext): MadeValue | null => {
  const exported = listExportedPatterns(origin, context).find(({ pattern }) => pattern.kind === kind)
  return exported === undefined || !isMaking(exported.pattern)
    ? null
    : madeBy(exported.pattern, patternKeyOf(exported.pattern), exported.library, exported.specifier)
}

const withMember = (origin: Origin | null, property: string): Origin | null => {
  if (origin === null) return null
  if (origin.kind === "made") return { ...origin, memberPath: [...origin.memberPath, property] }
  return { ...origin, paths: origin.paths.map((path) => [...path, property]) }
}

const isDefaultPath = (path: readonly string[]): boolean => path.length === 1 && path[0] === DEFAULT_EXPORT

export const asWholeModuleDefault = (origin: ExportOrigin): ExportOrigin => {
  const isWholeModule = origin.paths.some((path) => path.length === 0) && !origin.paths.some(isDefaultPath)
  return isWholeModule ? { ...origin, paths: [...origin.paths, [DEFAULT_EXPORT]] } : origin
}

function originOfClass(declaration: SyntaxNode, context: OriginContext, depth: number): Origin | null {
  return (
    context.reader
      .basesOf(declaration)
      .map((base) => originAt(base, context, depth))
      .map((origin) => (origin?.kind === "export" ? madeByExport(asWholeModuleDefault(origin), "class", context) : origin))
      .find((origin) => origin !== null) ?? null
  )
}

const receiverOf = (origin: ExportOrigin): ExportOrigin | null => {
  const paths = origin.paths.filter((path) => path.length > 1).map((path) => path.slice(0, -1))
  return paths.length === 0 ? null : { ...origin, paths }
}

const prefixWrittenAt = (position: SlotPosition | null, call: SyntaxNode, reader: SyntaxReader): string | null =>
  position === null ? null : (nodesAt(position, reader.passedTo(call), reader).map((node) => reader.textOf(node)).find((text) => text !== null) ?? null)

const handsInPlace = (callback: SyntaxNode, call: SyntaxNode, { reader }: OriginContext) => (method: MethodPattern): method is CallPattern =>
  method.kind === "call"
  && method.slots.some((slot) => slot.runs === RUNNING_IN_PLACE && nodesAt(slot.at, reader.passedTo(call), reader).some((node) => node.id === callback.id))

function originOfHandedFunction(holder: SyntaxNode, context: OriginContext, depth: number): Origin | null {
  const handed = context.reader.handedAt(holder)
  if (handed === null) return null
  const handing = { ...context, reader: handed.reader ?? context.reader }
  const called = handing.reader.expressionOf(handed.call)
  const receiver = called.kind === "call" ? originAt(called.callee, handing, depth) : null
  if (receiver?.kind !== "made") return null
  const method = listMethods(receiver, CALLED_KINDS).find(handsInPlace(handed.passed, handed.call, handing))
  if (method === undefined) return null
  return { ...rested(receiver), prefix: joinPrefixes(receiver.prefix, prefixWrittenAt(method.prefixAt ?? null, handed.call, handing.reader)) }
}

const madeFor = (origin: ExportOrigin, context: OriginContext, isMadeFor: (pattern: FactoryPattern, typeName: string) => boolean): MadeValue | null => {
  const made = exportedNamesOf(origin).flatMap((exported) =>
    context.libraries
      .filter((library) => isOfLanguage(library, context) && library.specifiers.includes(exported.specifier))
      .flatMap((library) =>
        library.patterns
          .filter((pattern): pattern is FactoryPattern => pattern.kind === "factory" && isMadeFor(pattern, exported.name))
          .map((pattern) => madeBy(pattern, patternKeyOf(pattern), library, exported.specifier))),
  )
  return made.length === 0 ? null : made[0]
}

const isMakingType = (pattern: FactoryPattern, typeName: string): boolean => pattern.makesType === typeName

const isParameterOfType = (pattern: FactoryPattern, typeName: string): boolean => pattern.parameterOfTypes?.includes(typeName) ?? false

function originOfType(type: SyntaxNode | null, context: OriginContext, depth: number, isMadeFor: (pattern: FactoryPattern, typeName: string) => boolean): Origin | null {
  const origin = type === null ? null : originAt(type, context, depth)
  return origin?.kind === "export" ? madeFor(origin, context, isMadeFor) : null
}

function originOfParameter(holder: SyntaxNode, context: OriginContext, depth: number): Origin | null {
  return originOfHandedFunction(holder, context, depth)
    ?? originOfType(context.reader.parameterTypeOf(holder), context, depth, isMakingType)
    ?? originOfType(context.reader.functionTypeOf(holder), context, depth, isParameterOfType)
}

function originOfBinding(binding: Binding, context: OriginContext, depth: number): Origin | null {
  if (binding.kind === "parameter") return originOfParameter(binding.holder, context, depth)
  if (binding.kind === "import") return { kind: "export", specifier: binding.specifier, paths: pathsOfImport(binding.importedName) }
  const declaring = { ...context, reader: binding.reader ?? context.reader }
  if (binding.kind === "class") return originOfClass(binding.declaration, declaring, depth)
  return binding.memberPath.reduce<Origin | null>(withMember, originAt(binding.value, declaring, depth))
}

const withWrittenPrefix = (made: Origin | null, call: SyntaxNode, { reader }: OriginContext): Origin | null =>
  made?.kind === "made" && made.memberPath.length === 0 ? { ...made, prefix: joinPrefixes(made.prefix, prefixWrittenAt(made.prefixAt, call, reader)), prefixAt: null } : made

const asDefaultExport = (origin: ExportOrigin): ExportOrigin | null =>
  origin.paths.some((path) => path.length === 0) && !origin.paths.some(isDefaultPath) ? { ...origin, paths: [[DEFAULT_EXPORT]] } : null

const madeByCallingExport = (origin: ExportOrigin, context: OriginContext): Origin | null => {
  const asDefault = asDefaultExport(origin)
  return madeByExport(origin, "factory", context) ?? (asDefault === null ? null : madeByExport(asDefault, "factory", context)) ?? receiverOf(origin)
}

const returnedPlaceOf = (origin: Origin, context: OriginContext): SlotPosition | null => {
  const patterns = origin.kind === "made" ? listMethods(origin, CALLED_KINDS) : listExportedPatterns(origin, context).map(({ pattern }) => pattern)
  const passing = patterns.find((pattern): pattern is CallPattern => pattern.kind === "call" && pattern.returnsAt !== undefined)
  return passing?.returnsAt ?? null
}

function originOfCall(call: SyntaxNode, callee: SyntaxNode, context: OriginContext, depth: number): Origin | null {
  const required = context.reader.requiredSpecifierOf(call)
  if (required !== null) return { kind: "export", specifier: required, paths: [[]] }
  const origin = originAt(callee, context, depth)
  if (origin === null) return null
  const returnedPlace = returnedPlaceOf(origin, context)
  const returned = returnedPlace === null ? [] : nodesAt(returnedPlace, context.reader.passedTo(call), context.reader)
  if (returned.length > 0) return originAt(returned[0], context, depth)
  const made = origin.kind === "made" ? madeByCalling(origin) : madeByCallingExport(origin, context)
  return withWrittenPrefix(made, call, context)
}

function originAt(node: SyntaxNode, context: OriginContext, depth: number): Origin | null {
  if (depth > DEEPEST_ORIGIN) return null
  const expression = context.reader.expressionOf(node)
  if (expression.kind === "wrapped") return originAt(expression.inner, context, depth + 1)
  if (expression.kind === "member") return withMember(originAt(expression.object, context, depth + 1), expression.property)
  if (expression.kind === "call") return originOfCall(node, expression.callee, context, depth + 1)
  if (expression.kind !== "name") return null
  const binding = context.reader.bindingOf(expression.name)
  return binding === null ? null : originOfBinding(binding, context, depth + 1)
}

export const originOf = (node: SyntaxNode, context: OriginContext): Origin | null => originAt(node, context, START_DEPTH)

export const originOfDeclaredClass = (declaration: SyntaxNode, context: OriginContext): Origin | null => originOfClass(declaration, context, START_DEPTH)
