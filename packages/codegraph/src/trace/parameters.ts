import { findSource } from "@/code/lines"
import type { ReviewViewContext } from "@/review-view-context"
import { isParameterOf } from "@/trace-diagram/listed-blocks"
import type { CodeBlock, SourceFile, SourceRange } from "@flightplan/configurations"

const RECEIVER_NAMES: ReadonlySet<string> = new Set(["self", "cls"])
const CALLABLE_TYPES: ReadonlySet<CodeBlock["type"]> = new Set<CodeBlock["type"]>(["function", "method", "hook", "component"])
const REMOVED = "removed"
const FIRST_COLUMN = 1
const DEFAULT_MARK = "="
const OPENERS: ReadonlySet<string> = new Set(["(", "[", "{"])
const CLOSERS: ReadonlySet<string> = new Set([")", "]", "}"])
const COMPARING_BEFORE: ReadonlySet<string> = new Set(["=", "!", "<", ">"])
const ARROW_OR_EQUALITY_AFTER: ReadonlySet<string> = new Set(["=", ">"])
const WHITESPACE = /\s+/g
const SPACE = " "

interface Scan {
  readonly depth: number
  readonly defaultAt: number | null
}

const isDefaultMark = (text: string, index: number, depth: number): boolean =>
  depth === 0 && text[index] === DEFAULT_MARK && !COMPARING_BEFORE.has(text[index - 1] ?? "") && !ARROW_OR_EQUALITY_AFTER.has(text[index + 1] ?? "")

const depthAfter = (character: string, depth: number): number => {
  if (OPENERS.has(character)) return depth + 1
  return CLOSERS.has(character) ? depth - 1 : depth
}

export const withoutDefault = (written: string): string => {
  const { defaultAt } = Array.from({ length: written.length }, (_, index) => index).reduce<Scan>(
    (scan, index) =>
      scan.defaultAt !== null ? scan : { depth: depthAfter(written[index], scan.depth), defaultAt: isDefaultMark(written, index, scan.depth) ? index : null },
    { depth: 0, defaultAt: null },
  )
  return (defaultAt === null ? written : written.slice(0, defaultAt)).replace(WHITESPACE, SPACE).trim()
}

const headLinesBetween = ({ lines }: SourceFile, firstLine: number, lastLine: number): string[] =>
  lines
    .filter((line) => line.mark !== REMOVED && line.number !== null && line.number >= firstLine && line.number <= lastLine)
    .map((line) => line.text)

export const textAt = (source: SourceFile, { start, end }: SourceRange): string | null => {
  const lines = headLinesBetween(source, start.line, end.line)
  if (lines.length !== end.line - start.line + 1) return null
  const lastIndex = lines.length - 1
  return lines
    .map((text, index) => {
      const from = index === 0 ? start.column - FIRST_COLUMN : 0
      return index === lastIndex ? text.slice(from, end.column - FIRST_COLUMN) : text.slice(from)
    })
    .join(SPACE)
}

const parameterTextOf = (parameter: CodeBlock, source: SourceFile | null): string => {
  const [range] = parameter.lineOfCodeRangeReference
  const written = source === null ? null : textAt(source, range)
  return written === null ? (parameter.name ?? "") : withoutDefault(written)
}

const isReceiver = ({ name }: CodeBlock): boolean => RECEIVER_NAMES.has(name ?? "")

export const parametersOf = (nodeType: CodeBlock["type"], root: CodeBlock, context: ReviewViewContext): string[] => {
  if (!CALLABLE_TYPES.has(nodeType)) return []
  const source = findSource(context.sources, root.astGraph.filePath)?.source ?? null
  return root.childrenBlocks
    .filter((child) => isParameterOf(child, root) && !isReceiver(child))
    .map((parameter) => parameterTextOf(parameter, source))
    .filter((text) => text !== "")
}
