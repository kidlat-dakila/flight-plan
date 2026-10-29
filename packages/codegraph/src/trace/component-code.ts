import { comparePositions } from "@/code-blocks/source-range"
import type { RenderGroup, RenderRow } from "@/trace-diagram/component-card"
import { referenceOf } from "@/trace-diagram/function-card"
import type { CodeBlock, CodeBlockSymbol, CodeBlockType, Position, SourceFile, SourceRange } from "@flightplan/configurations"
import { nameOfBlock } from "./names"
import { assignedTargetOf, assignedValueOf, parameterTextOf, textAt } from "./parameters"

const TYPE_MARK = ":"
const FIRST_COLUMN = 1
const REMOVED = "removed"
const SPACE = " "
const ELLIPSIS = "…"
const CALL_SUFFIX = "()"
const NAME_SEPARATOR = "."
const VUE_SUFFIX = ".vue"
const TEMPLATE_NAME = "<template>"
const RETURN_WORD = "return"
const ARROW = "=>"
const RETURN_LINES = 3
const STATE_HOOK = "useState"
const ELEMENT: CodeBlockType = "render"
const TYPE_DECLARATION: CodeBlockType = "type-declaration"
const TYPE_USE: CodeBlockSymbol["use"] = "type"
const CALLING: CodeBlockSymbol["use"] = "call"
const TYPE_OPENERS: ReadonlySet<string> = new Set(["(", "[", "{", "<"])
const TYPE_CLOSERS: ReadonlySet<string> = new Set([")", "]", "}", ">"])
const TYPE_ENDS: ReadonlySet<string> = new Set([",", ";"])
const ARROW_HEAD = "="
const TYPE_AFTER_NAME = /^\s*(?<optional>\??)\s*:\s*/u
const DECLARATION_KEYWORD = /^(?:const|let|var)\s+/u
const PATTERN_OPENERS: ReadonlySet<string> = new Set(["[", "{"])
const RETURN_START = /^return\b[\s(]*/u
const ELEMENT_START = /^<(?<tag>[^\s>/]*)/u
const FIRST_TOKEN = /^[^\s;,)]+/u
const CALL_ARGUMENTS = /^[\w$.]+(?:<[^()]*>)?\((?<inside>.*)\)$/su
const PATTERN_SYNTAX = /[\\^$.*+?()[\]{}|/]/gu
const TERNARY = /\s\?\s/u
const JOINING_OPERATOR = /&&|\|\||\?\?/u
const VUE_CONDITION = /\bv-(?:else-if|if|else|show)\b/u
const VUE_LOOP = "v-for"
const VUE_IF = "v-if"
const EMITS_MACRO = "defineEmits"

interface TypeScan {
  readonly depth: number
  readonly endAt: number | null
}

const isClosingArrow = (text: string, index: number): boolean => text[index] === ">" && text[index - 1] === ARROW_HEAD

const scanTypeStep = (text: string, index: number, { depth }: TypeScan): TypeScan => {
  const character = text[index]
  if (depth === 0 && TYPE_ENDS.has(character)) return { depth, endAt: index }
  if (TYPE_CLOSERS.has(character) && !isClosingArrow(text, index)) return depth === 0 ? { depth, endAt: index } : { depth: depth - 1, endAt: null }
  return { depth: TYPE_OPENERS.has(character) ? depth + 1 : depth, endAt: null }
}

const typeFrom = (text: string): string | null => {
  const { endAt } = Array.from({ length: text.length }, (_, index) => index).reduce<TypeScan>(
    (scan, index) => (scan.endAt !== null ? scan : scanTypeStep(text, index, scan)),
    { depth: 0, endAt: null },
  )
  const type = (endAt === null ? text : text.slice(0, endAt)).trim()
  return type === "" ? null : type
}

const headLineTexts = (source: SourceFile, firstLine: number, lastLine: number): string[] =>
  source.lines.filter((line) => line.mark !== REMOVED && line.number !== null && line.number >= firstLine && line.number <= lastLine).map((line) => line.text)

const restOfLine = (source: SourceFile, at: Position): string => (headLineTexts(source, at.line, at.line)[0] ?? "").slice(at.column - FIRST_COLUMN)

const memberPatternOf = (name: string): RegExp => new RegExp(`(?:^|[\\s{;,(<])${name.replace(PATTERN_SYNTAX, "\\$&")}\\s*(?<optional>\\??)\\s*:\\s*`, "u")

const annotationOf = (match: RegExpExecArray, typeText: string): string | null => {
  const type = typeFrom(typeText)
  return type === null ? null : `${match.groups?.optional ?? ""}${TYPE_MARK} ${type}`
}

const annotationOfMember = (texts: readonly string[], name: string): string | null => {
  const pattern = memberPatternOf(name)
  return texts.flatMap((text) => {
    const match = pattern.exec(text)
    return match === null ? [] : [annotationOf(match, text.slice(match.index + match[0].length))]
  }).find((annotation) => annotation !== null) ?? null
}

const annotationAfterName = (source: SourceFile, parameter: CodeBlock): string | null => {
  const rest = restOfLine(source, parameter.lineOfCodeRangeReference[0].end)
  const match = TYPE_AFTER_NAME.exec(rest)
  return match === null ? null : annotationOf(match, rest.slice(match[0].length))
}

const lastHeadLineOf = (parameter: CodeBlock, nodeBlock: CodeBlock): number => {
  const { end } = parameter.lineOfCodeRangeReference[0]
  const bodyLines = nodeBlock.childrenBlocks.filter((child) => child.type !== parameter.type).map((child) => child.lineOfCodeRangeReference[0].start.line)
  return Math.max(end.line, Math.min(...bodyLines, nodeBlock.lineOfCodeRangeReference[0].end.line) - 1)
}

const annotationInHead = (source: SourceFile, parameter: CodeBlock, nodeBlock: CodeBlock, name: string): string | null => {
  const { end } = parameter.lineOfCodeRangeReference[0]
  const texts = [restOfLine(source, end), ...headLineTexts(source, end.line + 1, lastHeadLineOf(parameter, nodeBlock))]
  return annotationOfMember([texts.join(SPACE)], name)
}

const declaredTypesOf = (nodeBlock: CodeBlock): CodeBlock[] =>
  nodeBlock.outerSymbols.flatMap((symbol) => {
    const reference = symbol.use === TYPE_USE ? referenceOf(symbol) : null
    return reference !== null && reference.type === TYPE_DECLARATION && reference.astGraph.filePath === nodeBlock.astGraph.filePath ? [reference] : []
  })

const annotationInDeclarations = (source: SourceFile, nodeBlock: CodeBlock, name: string): string | null =>
  declaredTypesOf(nodeBlock).map((declaration) => {
    const { start, end } = declaration.lineOfCodeRangeReference[0]
    return annotationOfMember(headLineTexts(source, start.line, end.line), name)
  }).find((annotation) => annotation !== null) ?? null

const holdsRange = (outer: SourceRange, inner: SourceRange): boolean =>
  comparePositions(outer.start, inner.start) <= 0 && comparePositions(inner.end, outer.end) <= 0

export const isEmittedEvent = (prop: CodeBlock, nodeBlock: CodeBlock, source: SourceFile | null): boolean => {
  const [range] = prop.lineOfCodeRangeReference
  return source !== null && nodeBlock.childrenBlocks.some((child) =>
    child.id !== prop.id && holdsRange(child.lineOfCodeRangeReference[0], range) && (textAt(source, child.lineOfCodeRangeReference[0]) ?? "").includes(EMITS_MACRO))
}

export const propTextOf = (parameter: CodeBlock, nodeBlock: CodeBlock, source: SourceFile | null): string => {
  const written = parameterTextOf(parameter, source)
  const name = parameter.name ?? (written === "" ? nameOfBlock(parameter) : written)
  const untyped = written === "" ? name : written
  if (source === null || written.includes(TYPE_MARK)) return untyped
  const annotation = annotationAfterName(source, parameter) ?? annotationInHead(source, parameter, nodeBlock, name) ?? annotationInDeclarations(source, nodeBlock, name)
  return annotation === null ? untyped : `${name}${annotation}`
}

const initialValueOf = (value: string, state: CodeBlock): string => {
  if (state.catalogue?.name !== STATE_HOOK) return value
  const inside = CALL_ARGUMENTS.exec(value)?.groups?.inside.trim() ?? ""
  return inside === "" ? value : inside
}

export const destructuredNamesOf = (written: string): string | null => {
  const target = assignedTargetOf(written)?.replace(DECLARATION_KEYWORD, "") ?? ""
  return PATTERN_OPENERS.has(target.charAt(0)) ? target : null
}

const stateNameOf = (state: CodeBlock, written: string | null): string => {
  const name = state.name ?? nameOfBlock(state)
  if (written === null || state.catalogue?.name === STATE_HOOK) return name
  return destructuredNamesOf(written) ?? name
}

export const stateTextOf = (state: CodeBlock, source: SourceFile | null): string => {
  const written = source === null ? null : textAt(source, state.lineOfCodeRangeReference[0])
  const name = stateNameOf(state, written)
  const value = written === null ? null : assignedValueOf(written)
  return value === null || value === "" ? name : `${name} = ${initialValueOf(value, state)}`
}

const listBlocksWithin = (block: CodeBlock): CodeBlock[] => block.childrenBlocks.flatMap((child) => [child, ...listBlocksWithin(child)])

const markupTagOf = (block: CodeBlock): string | null => [block, ...listBlocksWithin(block)].find((inner) => inner.type === ELEMENT)?.name ?? null

const elementOf = (tag: string): string => `<${tag}>`

const isVueBlock = (block: CodeBlock): boolean => block.astGraph.filePath.endsWith(VUE_SUFFIX)

const textAfterReturn = (source: SourceFile, at: Position): string =>
  [restOfLine(source, at), ...headLineTexts(source, at.line + 1, at.line + RETURN_LINES)].join(SPACE).replace(RETURN_START, "")

const writtenStartOf = (text: string): string | null => {
  const tag = ELEMENT_START.exec(text)?.groups?.tag
  if (tag !== undefined) return elementOf(tag)
  return FIRST_TOKEN.exec(text)?.[0] ?? null
}

const bodyNameOf = ({ block, markup }: RenderGroup): string => {
  if (isVueBlock(block)) return TEMPLATE_NAME
  const tag = markup === null ? null : markupTagOf(markup)
  return tag === null ? ARROW : `${ARROW} ${elementOf(tag)}`
}

export const renderGroupNameOf = (group: RenderGroup, source: SourceFile | null): string => {
  if (group.at === null) return bodyNameOf(group)
  const written = source === null ? null : writtenStartOf(textAfterReturn(source, group.at))
  const tag = group.markup === null ? null : markupTagOf(group.markup)
  const start = written ?? (tag === null ? null : elementOf(tag))
  return start === null ? RETURN_WORD : `${RETURN_WORD} ${start}`
}

const blockTextOf = (block: CodeBlock, source: SourceFile | null): string | null =>
  source === null ? null : textAt(source, block.lineOfCodeRangeReference[0])

const FIRST_BRANCH = 0

const jsxConditionNameOf = (text: string, tag: string, branch: number): string => {
  const shown = elementOf(tag)
  if (TERNARY.test(text)) return branch === FIRST_BRANCH ? `{${ELLIPSIS} ? ${shown} : ${ELLIPSIS}}` : `{${ELLIPSIS} ? ${ELLIPSIS} : ${shown}}`
  const operator = JOINING_OPERATOR.exec(text)?.[0]
  return operator === undefined ? `{${ELLIPSIS} ${shown}}` : `{${ELLIPSIS} ${operator} ${shown}}`
}

const conditionNameOf = (block: CodeBlock, source: SourceFile | null, shownTag: string | null = null, branch: number = FIRST_BRANCH): string => {
  const text = blockTextOf(block, source)
  const tag = shownTag ?? markupTagOf(block)
  if (tag === null) return nameOfBlock(block)
  if (isVueBlock(block)) return `<${tag} ${(text === null ? null : VUE_CONDITION.exec(text)?.[0]) ?? VUE_IF}>`
  return text === null ? nameOfBlock(block) : jsxConditionNameOf(text, tag, branch)
}

const symbolTextOf = (symbol: CodeBlockSymbol, source: SourceFile | null): string | null => {
  const written = source === null ? null : textAt(source, symbol.usedAt)
  if (written !== null) return written
  const reference = referenceOf(symbol)
  return reference === null ? null : [reference.name ?? nameOfBlock(reference), ...(symbol.member?.path ?? [])].join(NAME_SEPARATOR)
}

const loopNameOf = (block: CodeBlock, source: SourceFile | null): string => {
  const tag = markupTagOf(block)
  if (isVueBlock(block)) return tag === null ? nameOfBlock(block) : `<${tag} ${VUE_LOOP}>`
  const call = block.outerSymbols.find((symbol) => symbol.use === CALLING)
  const written = call === undefined ? null : symbolTextOf(call, source)
  return written === null ? nameOfBlock(block) : `${written}${CALL_SUFFIX}`
}

const wrapperNameOf = (block: CodeBlock, source: SourceFile | null): string =>
  block.type === "render-loop" ? loopNameOf(block, source) : conditionNameOf(block, source)

const valueNameOf = ({ symbol, rendered }: RenderRow, source: SourceFile | null): string => {
  const written = symbol === null ? null : symbolTextOf(symbol, source)
  const name = written ?? (rendered === null ? ELLIPSIS : nameOfBlock(rendered))
  return `{${name}${symbol?.use === CALLING ? CALL_SUFFIX : ""}}`
}

export const renderRowNameOf = (row: RenderRow, source: SourceFile | null): string => {
  if (row.kind === "value") return valueNameOf(row, source)
  if (row.kind !== "component") return wrapperNameOf(row.block, source)
  const tag = row.block.name ?? (row.rendered === null ? ELLIPSIS : nameOfBlock(row.rendered))
  if (row.wrapper === null) return `<${tag} />`
  return row.wrapper.type === "render-loop" ? loopNameOf(row.wrapper, source) : conditionNameOf(row.wrapper, source, tag, row.branch)
}
