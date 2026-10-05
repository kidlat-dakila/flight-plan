import { readFileVariables } from "@/ast-graph/languages/typescript/declarations"
import { readReferences } from "@/ast-graph/languages/typescript/references"
import { parseWithGrammar, queryCaptures, type SyntaxNode } from "@/ast-graph/parser"
import { rangeOf } from "@/ast-graph/source-range"
import type { FileVariable, SourceRange, SymbolReference, SymbolSpace } from "@/ast-graph/types"
import { valueOf } from "./sfc"
import { placeRange, rangeWithin, snippetWithin, type Snippet, type Wrapping } from "./snippet"

export interface TemplateNames {
  readonly variables: readonly FileVariable[]
  readonly references: readonly SymbolReference[]
}

type ReadAttribute = (value: SyntaxNode, element: SyntaxNode) => TemplateNames

const EXPRESSION_GRAMMAR = "typescript"
const VALUE_SPACE: readonly SymbolSpace[] = ["value"]
const NO_NAMES: TemplateNames = { variables: [], references: [] }
const ATTRIBUTE_PATTERN = "(attribute) @node"
const TEXT_PATTERN = "(text) @node"
const TAG_PATTERN = "[(start_tag (tag_name) @node) (self_closing_tag (tag_name) @node)]"
const ELEMENT_TYPE = "element"
const INTERPOLATION_PATTERN = /\{\{([\s\S]*?)\}\}/g
const INTERPOLATION_MARK_LENGTH = 2
const LOOP_PATTERN = /^([\s\S]*?)\s+(?:in|of)\s+([\s\S]+)$/
const PARENTHESISED_PATTERN = /^\s*\(([\s\S]*)\)\s*$/
const AS_EXPRESSION: Wrapping = { prefix: "(", suffix: ")" }
const AS_PARAMETERS: Wrapping = { prefix: "(", suffix: ") => 0" }
const AS_STATEMENTS: Wrapping = { prefix: "", suffix: "" }
const LOOP_DIRECTIVE = "v-for"
const SLOT_PREFIXES = ["#", "v-slot"]
const HANDLER_PREFIXES = ["@", "v-on"]
const BINDING_PREFIXES = [":", "v-"]
const DIRECTIVE_PREFIX = "v-"
const BUILT_IN_DIRECTIVES: ReadonlySet<string> = new Set([
  "bind",
  "cloak",
  "else",
  "else-if",
  "for",
  "html",
  "if",
  "memo",
  "model",
  "on",
  "once",
  "pre",
  "show",
  "slot",
  "text",
])
const DIRECTIVE_NAME_PATTERN = /^v-([a-z][a-z0-9-]*)/
const DIRECTIVE_VARIABLE_PREFIX = "v"
const MEMBER_MARK = "."
const WORD_BREAK_PATTERN = /-(\w)/g
const COMPONENT_TAG_PATTERN = /^[A-Z]|-/

const startsWithAny = (name: string, prefixes: readonly string[]): boolean => prefixes.some((prefix) => name.startsWith(prefix))

const camelCased = (name: string): string => name.replace(WORD_BREAK_PATTERN, (_match, letter: string) => letter.toUpperCase())

const capitalised = (name: string): string => `${name.charAt(0).toUpperCase()}${name.slice(1)}`

const mergeNames = (names: readonly TemplateNames[]): TemplateNames => ({
  variables: names.flatMap((one) => one.variables),
  references: names.flatMap((one) => one.references),
})

const readSnippet = (snippet: Snippet): TemplateNames => {
  const tree = parseWithGrammar(EXPRESSION_GRAMMAR, snippet.code)
  const place = placeRange(snippet)
  return {
    variables: readFileVariables(EXPRESSION_GRAMMAR, tree).map((variable) => ({ ...variable, range: place(variable.range), scope: place(variable.scope) })),
    references: readReferences(EXPRESSION_GRAMMAR, tree).map((reference) => ({ ...reference, range: place(reference.range) })),
  }
}

const readParameters = (snippet: Snippet, scope: SourceRange): TemplateNames => {
  const { variables, references } = readSnippet(snippet)
  const parameters = variables
    .filter((variable) => variable.declarationType === "argument")
    .map((variable): FileVariable => ({ ...variable, declarationType: "inline-declaration", scope }))
  return { variables: parameters, references }
}

const readExpression
  = (wrapping: Wrapping): ReadAttribute =>
    (value) => readSnippet(snippetWithin(value, 0, value.text.length, wrapping))

const readSlotProperties: ReadAttribute = (value, element) =>
  readParameters(snippetWithin(value, 0, value.text.length, AS_PARAMETERS), rangeOf(element))

const readLoop: ReadAttribute = (value, element) => {
  const loop = LOOP_PATTERN.exec(value.text)
  if (loop === null) return NO_NAMES
  const [, alias, source] = loop
  const unwrapped = PARENTHESISED_PATTERN.exec(alias)?.[1] ?? alias
  const aliasStart = value.text.indexOf(unwrapped)
  const sourceStart = value.text.length - source.length
  return mergeNames([
    readParameters(snippetWithin(value, aliasStart, aliasStart + unwrapped.length, AS_PARAMETERS), rangeOf(element)),
    readSnippet(snippetWithin(value, sourceStart, value.text.length, AS_EXPRESSION)),
  ])
}

const readerFor = (name: string): ReadAttribute | null => {
  if (name === LOOP_DIRECTIVE) return readLoop
  if (startsWithAny(name, SLOT_PREFIXES)) return readSlotProperties
  if (startsWithAny(name, HANDLER_PREFIXES)) return readExpression(AS_STATEMENTS)
  return startsWithAny(name, BINDING_PREFIXES) ? readExpression(AS_EXPRESSION) : null
}

const directiveReferenceOf = (name: SyntaxNode): SymbolReference[] => {
  const directive = DIRECTIVE_NAME_PATTERN.exec(name.text)?.[1]
  if (directive === undefined || BUILT_IN_DIRECTIVES.has(directive)) return []
  const variable = `${DIRECTIVE_VARIABLE_PREFIX}${capitalised(camelCased(directive))}`
  return [{ name: variable, range: rangeWithin(name, 0, DIRECTIVE_PREFIX.length + directive.length), spaces: VALUE_SPACE }]
}

const readAttribute = (attribute: SyntaxNode): TemplateNames => {
  const name = attribute.firstNamedChild
  const value = valueOf(attribute)
  const element = attribute.closest(ELEMENT_TYPE)
  if (name === null) return NO_NAMES
  const directive = { variables: [], references: directiveReferenceOf(name) }
  const read = readerFor(name.text)
  return value === null || element === null || read === null ? directive : mergeNames([directive, read(value, element)])
}

const readText = (text: SyntaxNode): TemplateNames =>
  mergeNames(
    [...text.text.matchAll(INTERPOLATION_PATTERN)].map((interpolation) => {
      const start = interpolation.index + INTERPOLATION_MARK_LENGTH
      return readSnippet(snippetWithin(text, start, start + interpolation[1].length, AS_EXPRESSION))
    }),
  )

const namesOfTag = (tag: string): string[] => {
  if (tag.includes(MEMBER_MARK)) return [tag.slice(0, tag.indexOf(MEMBER_MARK))]
  if (!COMPONENT_TAG_PATTERN.test(tag)) return []
  return [...new Set([capitalised(camelCased(tag)), camelCased(tag)])]
}

const readTag = (tag: SyntaxNode): TemplateNames => {
  const names = namesOfTag(tag.text)
  const range = rangeWithin(tag, 0, tag.text.includes(MEMBER_MARK) ? tag.text.indexOf(MEMBER_MARK) : tag.text.length)
  return { variables: [], references: names.map((name) => ({ name, range, spaces: VALUE_SPACE })) }
}

const READERS: readonly (readonly [pattern: string, read: (node: SyntaxNode) => TemplateNames])[] = [
  [TAG_PATTERN, readTag],
  [ATTRIBUTE_PATTERN, readAttribute],
  [TEXT_PATTERN, readText],
]

export const readTemplateNames = (template: SyntaxNode | null): TemplateNames => {
  if (template === null) return NO_NAMES
  return mergeNames(READERS.flatMap(([pattern, read]) => queryCaptures("html", template, pattern).map((capture) => read(capture.node))))
}
