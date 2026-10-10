import { MARKUP_PATTERN } from "@/ast-graph/languages/jsx/syntax-sites"
import { readFileStatements } from "@/ast-graph/languages/typescript/statements"
import type { SyntaxNode } from "@/ast-graph/parser"
import { rangeOf } from "@/ast-graph/source-range"
import type { Statement } from "@/ast-graph/types"
import { listAttributes, listChildElements, type WrittenAttribute } from "./markup"
import type { ParsedScript } from "./script"
import { componentRangeOf, listComponentParts, type Sfc } from "./sfc"

const LINE_BREAK = "\n"
const JSX_GRAMMAR = "tsx"
const BRANCH_DIRECTIVES: ReadonlySet<string> = new Set(["v-if", "v-else-if", "v-else"])
const FOLLOWING_DIRECTIVES: ReadonlySet<string> = new Set(["v-else-if", "v-else"])

const firstLineOf = (text: string): string => text.split(LINE_BREAK)[0].trim()

const statementsOfScript = ({ block, tree }: ParsedScript): Statement[] =>
  readFileStatements(block.grammar, tree, block.grammar === JSX_GRAMMAR ? MARKUP_PATTERN : null)

const toMarkup = (element: SyntaxNode): Statement => ({
  type: "markup",
  text: firstLineOf(element.text),
  range: rangeOf(element),
  arms: [],
  statements: listChildElements(element).map(toMarkup),
})

const branchDirectiveOf = (element: SyntaxNode): WrittenAttribute | null =>
  listAttributes(element).find((attribute) => BRANCH_DIRECTIVES.has(attribute.name)) ?? null

const isFollowingBranch = (element: SyntaxNode): boolean => listAttributes(element).some((attribute) => FOLLOWING_DIRECTIVES.has(attribute.name))

const toBranch = (element: SyntaxNode): Statement => {
  const directive = branchDirectiveOf(element)
  const markup = toMarkup(element)
  return directive === null ? markup : { type: "return", text: firstLineOf(directive.node.text), range: markup.range, arms: [], statements: [markup] }
}

const statementsOfTemplate = (template: SyntaxNode | null): Statement[] => {
  if (template === null) return []
  const roots = listChildElements(template)
  if (roots.some(isFollowingBranch)) return roots.map(toBranch)
  return [{ type: "return", text: firstLineOf(template.text), range: rangeOf(template), arms: [], statements: roots.map(toMarkup) }]
}

const inSourceOrder = (statements: readonly Statement[]): Statement[] =>
  [...statements].sort((one, two) => one.range.start.line - two.range.start.line || one.range.start.column - two.range.start.column)

export const readVueStatements = (sfc: Sfc, scripts: readonly ParsedScript[]): Statement[] => {
  const beside = scripts.filter((script) => !script.block.isSetup).flatMap(statementsOfScript)
  const range = componentRangeOf(sfc)
  if (range === null) return beside
  const body = scripts.filter((script) => script.block.isSetup).flatMap(statementsOfScript)
  const component: Statement = {
    type: "declaration",
    text: firstLineOf(listComponentParts(sfc)[0].text),
    range,
    arms: [],
    statements: inSourceOrder([...body, ...statementsOfTemplate(sfc.template)]),
  }
  return inSourceOrder([...beside, component])
}
