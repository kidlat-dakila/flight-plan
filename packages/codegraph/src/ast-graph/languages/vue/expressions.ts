import { type SyntaxNode, queryCaptures, type GrammarId } from "@/ast-graph/parser"
import { patternOfTypes } from "@/ast-graph/query-nodes"
import { rangeOf } from "@/ast-graph/source-range"
import type { SourceRange as SyntaxRange } from "@/ast-graph/types"
import type { Splice } from "./blanked"
import { isExpression, isHandler, isLoop, isSlotProperties, listAttributes, type WrittenAttribute } from "./markup"
import { rangeWithin } from "./snippet"

export interface TemplateAlias {
  readonly name: string
  readonly scope: SyntaxRange
}

export interface WrittenExpression {
  readonly from: number
  readonly to: number
  readonly element: SyntaxNode
  readonly attribute: WrittenAttribute | null
}

export interface DeclaringRange {
  readonly range: SyntaxRange
  readonly scope: SyntaxRange
}

export interface TemplateExpressions {
  readonly splices: readonly Splice[]
  readonly aliases: readonly TemplateAlias[]
  readonly expressions: readonly WrittenExpression[]
  readonly declaring: readonly DeclaringRange[]
}

const GRAMMAR: GrammarId = "html"
const ELEMENT_PATTERN = patternOfTypes(["element"])
const TEXT_PATTERN = patternOfTypes(["text"])
const INTERPOLATION_PATTERN = /\{\{([\s\S]*?)\}\}/g
const INTERPOLATION_MARK_LENGTH = 2
const LOOP_PATTERN = /^([\s\S]*?)\s(in|of)\s[\s\S]+$/
const LOOP_KEYWORD = "in"
const NAME_PATTERN = /[A-Za-z_$][\w$]*/g
const OPENING = "("
const CLOSING = ")"
const STATEMENT_END = ";"
const QUOTE_LENGTH = 1
const NOTHING: TemplateExpressions = { splices: [], aliases: [], expressions: [], declaring: [] }

const namesIn = (text: string): string[] => [...text.matchAll(NAME_PATTERN)].map((match) => match[0])

const aliasesOf = (text: string, element: SyntaxNode): TemplateAlias[] => namesIn(text).map((name) => ({ name, scope: rangeOf(element) }))

const withLoopKeyword = (text: string): string => {
  const loop = LOOP_PATTERN.exec(text)
  if (loop === null) return text
  const keywordAt = loop[1].length + 1
  return `${text.slice(0, keywordAt)}${LOOP_KEYWORD}${text.slice(keywordAt + LOOP_KEYWORD.length)}`
}

const wrapped = (value: SyntaxNode, text: string, isQuoted: boolean): Splice[] =>
  isQuoted
    ? [{ from: value.startIndex - QUOTE_LENGTH, content: `${OPENING}${text}${CLOSING}${STATEMENT_END}` }]
    : [{ from: value.startIndex, content: `${text}${STATEMENT_END}` }]

const unwrapped = (value: SyntaxNode, isQuoted: boolean): Splice[] => [
  { from: value.startIndex, content: value.text },
  { from: value.endIndex + (isQuoted ? QUOTE_LENGTH : 0), content: STATEMENT_END },
]

const readAttribute = (attribute: WrittenAttribute, element: SyntaxNode): TemplateExpressions => {
  const { value, isQuoted } = attribute
  if (value === null) return NOTHING
  const written: WrittenExpression = { from: value.startIndex, to: value.endIndex, element, attribute }
  const scope = rangeOf(element)
  if (isSlotProperties(attribute)) {
    return { splices: wrapped(value, value.text, isQuoted), aliases: aliasesOf(value.text, element), expressions: [], declaring: [{ range: rangeOf(value), scope }] }
  }
  if (isHandler(attribute)) return { ...NOTHING, splices: unwrapped(value, isQuoted), expressions: [written] }
  if (!isExpression(attribute)) return NOTHING
  if (!isLoop(attribute)) return { ...NOTHING, splices: wrapped(value, value.text, isQuoted), expressions: [written] }
  const alias = LOOP_PATTERN.exec(value.text)?.[1] ?? ""
  return {
    splices: wrapped(value, withLoopKeyword(value.text), isQuoted),
    aliases: aliasesOf(alias, element),
    expressions: [written],
    declaring: [{ range: rangeWithin(value, 0, alias.length), scope }],
  }
}

const readText = (text: SyntaxNode): TemplateExpressions => {
  const element = text.parent
  if (element === null) return NOTHING
  const interpolations = [...text.text.matchAll(INTERPOLATION_PATTERN)].map((interpolation) => {
    const from = text.startIndex + interpolation.index + INTERPOLATION_MARK_LENGTH
    return { from, to: from + interpolation[1].length, content: interpolation[1] }
  })
  return {
    splices: interpolations.map(({ from, content }) => ({ from: from - QUOTE_LENGTH, content: `${OPENING}${content}${CLOSING}${STATEMENT_END}` })),
    aliases: [],
    expressions: interpolations.map(({ from, to }) => ({ from, to, element, attribute: null })),
    declaring: [],
  }
}

const joined = (read: readonly TemplateExpressions[]): TemplateExpressions => ({
  splices: read.flatMap((one) => one.splices),
  aliases: read.flatMap((one) => one.aliases),
  expressions: read.flatMap((one) => one.expressions),
  declaring: read.flatMap((one) => one.declaring),
})

const nodesWithin = (template: SyntaxNode, pattern: string): SyntaxNode[] => queryCaptures(GRAMMAR, template, pattern).map((capture) => capture.node)

export const readTemplateExpressions = (template: SyntaxNode): TemplateExpressions =>
  joined([
    ...nodesWithin(template, ELEMENT_PATTERN).flatMap((element) => listAttributes(element).map((attribute) => readAttribute(attribute, element))),
    ...nodesWithin(template, TEXT_PATTERN).map(readText),
  ])
