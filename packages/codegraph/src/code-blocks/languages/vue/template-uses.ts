import { readFileVariables } from "@/ast-graph/languages/typescript/declarations"
import { readReferences } from "@/ast-graph/languages/typescript/references"
import type { TemplateAlias, WrittenExpression } from "@/ast-graph/languages/vue/expressions"
import { camelCased, capitalised, handedNameOf, isComponentTag, tagNameOf } from "@/ast-graph/languages/vue/markup"
import type { ParsedTemplate } from "@/ast-graph/languages/vue/template"
import type { GrammarId, SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { containsPosition, isSameRange, positionKey, rangeOf } from "@/ast-graph/source-range"
import type { SourceRange as SyntaxRange, SymbolReference, SymbolSpace } from "@/ast-graph/types"
import { resolveAll, type FileOutline, type Resolution } from "@/code-blocks/languages/typescript/outline"
import { readUses, targetOf } from "@/code-blocks/languages/typescript/uses"
import { WRITTEN_NOWHERE, type ReadHanding, type ReadUse, type WrittenAt } from "@/code-blocks/reading"
import { comparePositions, FIRST_COLUMN, rangeOfNode } from "@/code-blocks/source-range"
import type { SourceRange } from "@/code-blocks/types"
import type { ArgumentKey } from "./component-arguments"

export interface HandedPlace {
  readonly handing: ReadHanding | null
  readonly writtenAt: WrittenAt
}

export type FindHandedPlace = (whole: SourceRange) => HandedPlace | null

export interface TemplateReading {
  readonly outline: FileOutline
  readonly uses: readonly ReadUse[]
  readonly findHandedPlace: FindHandedPlace
}

interface Names {
  readonly candidates: readonly Resolution[]
}

const GRAMMAR: GrammarId = "typescript"
const VALUE_SPACES: readonly SymbolSpace[] = ["value"]
const MEMBER_MARK = "."
const LINE_BREAK = "\n"
const FILE_START = { line: 1, column: 0 }
const ELEMENT_TYPE = "element"

const isShadowed = ({ name, range }: SymbolReference, aliases: readonly TemplateAlias[]): boolean =>
  aliases.some((alias) => alias.name === name && containsPosition(alias.scope, range.start))

const seenEverywhere = <Declared extends { readonly scope: SyntaxRange }>(declared: Declared, moduleScope: SyntaxRange, fileRange: SyntaxRange): Declared =>
  isSameRange(declared.scope, moduleScope) ? { ...declared, scope: fileRange } : declared

const scriptCandidatesOf = (script: FileOutline | null, fileRange: SyntaxRange): Resolution[] => {
  if (script === null) return []
  const moduleScope = rangeOf(script.tree.rootNode)
  return [
    ...script.declarations.map((declaration): Resolution => ({ kind: "local", declaration: seenEverywhere(declaration, moduleScope, fileRange) })),
    ...script.imports.map((variable): Resolution => ({ kind: "import", variable: seenEverywhere(variable, moduleScope, fileRange) })),
  ]
}

const toSyntaxRange = ({ start, end }: SourceRange): SyntaxRange => ({
  start: { line: start.line, column: start.column - FIRST_COLUMN },
  end: { line: end.line, column: end.column - FIRST_COLUMN },
})

type NamedPlace = Pick<ArgumentKey, "name" | "range">

const propCandidateOf = ({ name, range }: NamedPlace, fileRange: SyntaxRange): Resolution => ({
  kind: "local",
  declaration: { name, range: toSyntaxRange(range), scope: fileRange, spaces: VALUE_SPACES, declarationType: "inline-declaration", type: "primitive" },
})

const resolveName = (name: string, at: SyntaxRange, { candidates }: Names): Resolution | null =>
  resolveAll(candidates, [{ name, range: at, spaces: VALUE_SPACES }]).map((resolved) => resolved.resolution)[0] ?? null

const namesOfTag = (tag: string): string[] => {
  if (tag.includes(MEMBER_MARK)) return [tag.slice(0, tag.indexOf(MEMBER_MARK))]
  return isComponentTag(tag) ? [...new Set([tag, capitalised(camelCased(tag)), camelCased(tag)])] : []
}

const resolveTag = (element: SyntaxNode, names: Names): Resolution | null => {
  const tagName = tagNameOf(element)
  if (tagName === null) return null
  const at = rangeOf(tagName)
  return namesOfTag(tagName.text).map((name) => resolveName(name, at, names)).find((resolution) => resolution !== null) ?? null
}

const renderedUseOf = (element: SyntaxNode, names: Names): ReadUse[] => {
  const tagName = tagNameOf(element)
  const resolution = resolveTag(element, names)
  if (tagName === null || resolution === null) return []
  const memberPath = tagName.text.includes(MEMBER_MARK) ? tagName.text.split(MEMBER_MARK).slice(1) : []
  return [{ usedAt: rangeOfNode(tagName), use: "render", memberPath, target: targetOf(resolution), handing: null, writtenAt: WRITTEN_NOWHERE }]
}

const wholeRangeOf = ({ attribute }: WrittenExpression): SourceRange | null => {
  const value = attribute?.value ?? null
  if (value === null) return null
  const written = value.text.trim()
  const leading = value.text.length - value.text.trimStart().length
  if (written.includes(LINE_BREAK) || value.text.slice(0, leading).includes(LINE_BREAK)) return null
  const { start } = rangeOfNode(value)
  return { start: { line: start.line, column: start.column + leading }, end: { line: start.line, column: start.column + leading + written.length } }
}

const isSameSpan = (one: SourceRange, two: SourceRange): boolean =>
  comparePositions(one.start, two.start) === 0 && comparePositions(one.end, two.end) === 0

const handedPlaceOf = (whole: SourceRange, expressions: readonly WrittenExpression[], names: Names): HandedPlace | null => {
  const written = expressions.find((expression) => {
    const range = wholeRangeOf(expression)
    return range !== null && isSameSpan(range, whole)
  })
  const slot = written?.attribute === undefined || written.attribute === null ? null : handedNameOf(written.attribute)
  if (written === undefined || slot === null) return null
  const receiver = resolveTag(written.element, names)
  return { handing: receiver === null ? null : { receiver: targetOf(receiver), slot }, writtenAt: { slot, keyPath: [], isSpread: false, isBase: false } }
}

const handedOver = (use: ReadUse, expressions: readonly WrittenExpression[], names: Names): ReadUse => {
  const handed = use.use === "value" || use.use === "read" ? handedPlaceOf(use.usedAt, expressions, names) : null
  if (handed === null) return use
  return handed.handing === null ? { ...use, writtenAt: handed.writtenAt } : { ...use, ...handed }
}

const outlineOf = (tree: SyntaxTree, aliases: readonly TemplateAlias[], names: Names): FileOutline => {
  const declarations = readFileVariables(GRAMMAR, tree)
  const candidates = [...declarations.map((declaration): Resolution => ({ kind: "local", declaration })), ...names.candidates]
  const resolved = resolveAll(candidates, readReferences(GRAMMAR, tree).filter((reference) => !isShadowed(reference, aliases)))
  return {
    tree,
    declarations: resolved.flatMap(({ resolution }) => (resolution.kind === "local" ? [resolution.declaration] : [])),
    imports: [],
    resolved,
    resolutionByStart: new Map(resolved.map(({ reference, resolution }) => [positionKey(reference.range.start), resolution] as const)),
    localExports: [],
    forwardedExports: [],
    importedFilePaths: new Map(),
  }
}

export interface TemplateSources {
  readonly parsed: ParsedTemplate
  readonly template: SyntaxNode
  readonly script: FileOutline | null
  readonly props: readonly ArgumentKey[]
  readonly members: readonly NamedPlace[]
}

export const readTemplateUses = ({ parsed, template, script, props, members }: TemplateSources): TemplateReading => {
  const fileRange: SyntaxRange = { start: FILE_START, end: rangeOf(template.tree.rootNode).end }
  const names: Names = { candidates: [...scriptCandidatesOf(script, fileRange), ...[...props, ...members].map((key) => propCandidateOf(key, fileRange))] }
  const { aliases, expressions } = parsed.expressions
  const outline = outlineOf(parsed.tree, aliases, names)
  const elements = template.descendantsOfType(ELEMENT_TYPE)
  return {
    outline,
    uses: [
      ...elements.flatMap((element) => renderedUseOf(element, names)),
      ...readUses(outline, script?.tree ?? outline.tree).map((use) => handedOver(use, expressions, names)),
    ],
    findHandedPlace: (whole) => handedPlaceOf(whole, expressions, names),
  }
}
