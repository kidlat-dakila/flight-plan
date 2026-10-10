import { readFileVariables } from "@/ast-graph/languages/typescript/declarations"
import { readReferences } from "@/ast-graph/languages/typescript/references"
import { parseWithGrammar, queryCaptures, type SyntaxNode, type SyntaxTree } from "@/ast-graph/parser"
import { containsRange } from "@/ast-graph/source-range"
import type { FileVariable, SymbolReference, SymbolSpace } from "@/ast-graph/types"
import { writeOverBlanks } from "./blanked"
import { readTemplateExpressions, type DeclaringRange, type TemplateExpressions } from "./expressions"
import { rangeWithin } from "./snippet"

export interface TemplateNames {
  readonly variables: readonly FileVariable[]
  readonly references: readonly SymbolReference[]
}

export interface ParsedTemplate {
  readonly expressions: TemplateExpressions
  readonly tree: SyntaxTree
}

const EXPRESSION_GRAMMAR = "typescript"
const VALUE_SPACE: readonly SymbolSpace[] = ["value"]
const NO_NAMES: TemplateNames = { variables: [], references: [] }
const ATTRIBUTE_PATTERN = "(attribute) @node"
const TAG_PATTERN = "[(start_tag (tag_name) @node) (self_closing_tag (tag_name) @node)]"
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

const camelCased = (name: string): string => name.replace(WORD_BREAK_PATTERN, (_match, letter: string) => letter.toUpperCase())

const capitalised = (name: string): string => `${name.charAt(0).toUpperCase()}${name.slice(1)}`

export const parseTemplate = (template: SyntaxNode | null, source: string): ParsedTemplate | null => {
  if (template === null) return null
  const expressions = readTemplateExpressions(template)
  return { expressions, tree: parseWithGrammar(EXPRESSION_GRAMMAR, writeOverBlanks(source, expressions.splices)) }
}

const directiveReferenceOf = (name: SyntaxNode): SymbolReference[] => {
  const directive = DIRECTIVE_NAME_PATTERN.exec(name.text)?.[1]
  if (directive === undefined || BUILT_IN_DIRECTIVES.has(directive)) return []
  const variable = `${DIRECTIVE_VARIABLE_PREFIX}${capitalised(camelCased(directive))}`
  return [{ name: variable, range: rangeWithin(name, 0, DIRECTIVE_PREFIX.length + directive.length), spaces: VALUE_SPACE }]
}

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

const readDirective = (attribute: SyntaxNode): SymbolReference[] => {
  const name = attribute.firstNamedChild
  return name === null ? [] : directiveReferenceOf(name)
}

const declaringAt = ({ range }: SymbolReference, declaring: readonly DeclaringRange[]): DeclaringRange | null =>
  declaring.find((declared) => containsRange(declared.range, range)) ?? null

const toDeclared = ({ name, range }: SymbolReference, { scope }: DeclaringRange): FileVariable => ({
  name,
  range,
  scope,
  spaces: VALUE_SPACE,
  declarationType: "inline-declaration",
  type: "primitive",
})

const readExpressionNames = ({ expressions: { declaring }, tree }: ParsedTemplate): TemplateNames => {
  const written = readReferences(EXPRESSION_GRAMMAR, tree)
  const declared = written.flatMap((reference) => {
    const declaredAt = declaringAt(reference, declaring)
    return declaredAt === null ? [] : [toDeclared(reference, declaredAt)]
  })
  return {
    variables: [...declared, ...readFileVariables(EXPRESSION_GRAMMAR, tree)],
    references: written.filter((reference) => declaringAt(reference, declaring) === null),
  }
}

export const readTemplateNames = (template: SyntaxNode | null, parsed: ParsedTemplate | null): TemplateNames => {
  if (template === null || parsed === null) return NO_NAMES
  const named = readExpressionNames(parsed)
  const tags = queryCaptures("html", template, TAG_PATTERN).flatMap((capture) => readTag(capture.node).references)
  const directives = queryCaptures("html", template, ATTRIBUTE_PATTERN).flatMap((capture) => readDirective(capture.node))
  return { variables: named.variables, references: [...tags, ...directives, ...named.references] }
}
