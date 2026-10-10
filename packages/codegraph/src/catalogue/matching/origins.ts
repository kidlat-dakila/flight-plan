import { NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import type { SyntaxNode } from "@/ast-graph/parser"
import { patternKeyOf } from "@/catalogue/pattern-keys"
import type { CalledValue, CatalogueLibrary, CataloguePattern, ClassPattern, FactoryPattern, MethodPattern } from "@/catalogue/types"
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
const NAMED_KINDS: ReadonlySet<CataloguePattern["kind"]> = new Set<CataloguePattern["kind"]>(["call", "factory", "decorator", "element", "class"])

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

const isExportedAs = (pattern: NamedPattern, { specifier, name }: ExportedName): boolean =>
  pattern.name === name && (pattern.from === undefined || pattern.from === specifier)

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

const madeBy = (pattern: FactoryPattern | ClassPattern, key: string, library: CatalogueLibrary, specifier: string): MadeValue => ({
  kind: "made",
  library,
  specifier,
  key,
  methods: pattern.methods,
  called: pattern.kind === "factory" ? (pattern.called ?? null) : null,
  memberPath: [],
})

const isMaking = (pattern: CataloguePattern): pattern is FactoryPattern | ClassPattern => pattern.kind === "factory" || pattern.kind === "class"

export const listMethods = (made: MadeValue, kinds: ReadonlySet<MethodPattern["kind"]>): MethodPattern[] =>
  made.memberPath.length === 0 ? [] : made.methods.filter((method) => kinds.has(method.kind) && fitsMemberPath(method.name, made.memberPath))

const rested = (made: MadeValue): MadeValue => ({ ...made, memberPath: [] })

const madeByCalling = (made: MadeValue): MadeValue => {
  const factory = made.methods.find((method): method is FactoryPattern => method.kind === "factory" && fitsMemberPath(method.name, made.memberPath))
  if (made.memberPath.length > 0) {
    return factory === undefined ? rested(made) : madeBy(factory, keyBelow(made.key, patternKeyOf(factory)), made.library, made.specifier)
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

function originOfClass(declaration: SyntaxNode, context: OriginContext, depth: number): Origin | null {
  return (
    context.reader
      .basesOf(declaration)
      .map((base) => originAt(base, context, depth))
      .map((origin) => (origin?.kind === "export" ? madeByExport(origin, "class", context) : origin))
      .find((origin) => origin !== null) ?? null
  )
}

const receiverOf = (origin: ExportOrigin): ExportOrigin | null => {
  const paths = origin.paths.filter((path) => path.length > 1).map((path) => path.slice(0, -1))
  return paths.length === 0 ? null : { ...origin, paths }
}

const isHandedInPlace = (callback: SyntaxNode, call: SyntaxNode, made: MadeValue, { reader }: OriginContext): boolean =>
  listMethods(made, CALLED_KINDS).some(
    (method) =>
      method.kind === "call"
      && method.slots.some((slot) => slot.runs === RUNNING_IN_PLACE && nodesAt(slot.at, reader.passedTo(call), reader).some((node) => node.id === callback.id)),
  )

function originOfParameter(holder: SyntaxNode, context: OriginContext, depth: number): Origin | null {
  const call = context.reader.callHandedTo(holder)
  const called = call === null ? null : context.reader.expressionOf(call)
  const receiver = called?.kind === "call" ? originAt(called.callee, context, depth) : null
  if (call === null || receiver?.kind !== "made") return null
  return isHandedInPlace(holder, call, receiver, context) ? rested(receiver) : null
}

function originOfBinding(binding: Binding, context: OriginContext, depth: number): Origin | null {
  if (binding.kind === "parameter") return originOfParameter(binding.holder, context, depth)
  if (binding.kind === "import") return { kind: "export", specifier: binding.specifier, paths: pathsOfImport(binding.importedName) }
  const declaring = { ...context, reader: binding.reader ?? context.reader }
  if (binding.kind === "class") return originOfClass(binding.declaration, declaring, depth)
  return binding.memberPath.reduce<Origin | null>(withMember, originAt(binding.value, declaring, depth))
}

function originOfCall(callee: SyntaxNode, context: OriginContext, depth: number): Origin | null {
  const origin = originAt(callee, context, depth)
  if (origin === null) return null
  return origin.kind === "made" ? madeByCalling(origin) : (madeByExport(origin, "factory", context) ?? receiverOf(origin))
}

function originAt(node: SyntaxNode, context: OriginContext, depth: number): Origin | null {
  if (depth > DEEPEST_ORIGIN) return null
  const expression = context.reader.expressionOf(node)
  if (expression.kind === "wrapped") return originAt(expression.inner, context, depth + 1)
  if (expression.kind === "member") return withMember(originAt(expression.object, context, depth + 1), expression.property)
  if (expression.kind === "call") return originOfCall(expression.callee, context, depth + 1)
  if (expression.kind !== "name") return null
  const binding = context.reader.bindingOf(expression.name)
  return binding === null ? null : originOfBinding(binding, context, depth + 1)
}

export const originOf = (node: SyntaxNode, context: OriginContext): Origin | null => originAt(node, context, START_DEPTH)

export const originOfDeclaredClass = (declaration: SyntaxNode, context: OriginContext): Origin | null => originOfClass(declaration, context, START_DEPTH)
