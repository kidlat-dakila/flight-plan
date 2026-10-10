import { findDefinition, type ASTGraphFile, type Definition, type Encapsulation, type FilesByPath, type LineRange, type SourceRange } from "@/ast-graph"
import { containsRange, joinAdjacentLines, linesOf } from "@/ast-graph/source-range"
import { firstOfEach } from "@/shared/first-of-each"
import type { CodeSpan, CodeView, CodeViewKind } from "@flightplan/configurations"
import { listReturnStatements } from "./return-statements"
import { findMarkupAt } from "./traced-lines"
import { listDataReads, listEventRanges, listHandedFunctionRanges } from "./traced-names"

export interface ViewedComponent {
  readonly files: FilesByPath
  readonly file: ASTGraphFile
  readonly component: Encapsulation
}

const KEY_SEPARATOR = ":"
const INDENTATION = /^\s*/u
const ONE_ENTRY = 1

const indentationOf = (text: string): number => INDENTATION.exec(text)?.[0].length ?? 0

const toCodeSpans = (file: ASTGraphFile, { start, end }: SourceRange): CodeSpan[] =>
  Array.from({ length: end.line - start.line + 1 }, (_line, offset) => start.line + offset)
    .map((line) => {
      const text = file.readLine(line).trimEnd()
      return {
        line,
        startColumn: line === start.line ? start.column : indentationOf(text),
        endColumn: line === end.line ? end.column : text.length,
      }
    })
    .filter((span) => span.startColumn < span.endColumn)

const toLineSpans = (lines: readonly LineRange[]): CodeView["lines"] => joinAdjacentLines(lines).map(([startLine, endLine]) => [startLine, endLine])

const inReadingOrder = (marks: readonly CodeSpan[]): CodeSpan[] =>
  [...marks].sort((one, two) => one.line - two.line || one.startColumn - two.startColumn)

const toCodeView = (kind: CodeViewKind, path: string, lines: readonly LineRange[], marks: readonly CodeSpan[], entryCount: number): CodeView => ({
  kind,
  path,
  lines: toLineSpans(lines),
  marks: inReadingOrder(marks),
  entryCount,
})

export const toDeclarationView = (path: string, lines: readonly LineRange[]): CodeView => toCodeView("declaration", path, lines, [], ONE_ENTRY)

const definitionKeyOf = ({ path, lines: [startLine, endLine] }: Definition): string => [path, startLine, endLine].join(KEY_SEPARATOR)

const marksOf = (files: FilesByPath, { path, name }: Definition): CodeSpan[] => {
  const file = files.get(path)
  return file === undefined || name === null ? [] : toCodeSpans(file, name)
}

const listDataViews = ({ files, file, component }: ViewedComponent, scope: SourceRange): CodeView[] => {
  const definitions = firstOfEach(
    listDataReads(file, component)
      .filter((read) => containsRange(scope, read.range))
      .flatMap((read) => {
        const definition = findDefinition(files, file, read)
        return definition === null ? [] : [definition]
      }),
    definitionKeyOf,
  )
  return [...new Set(definitions.map((definition) => definition.path))].map((path) => {
    const inFile = definitions.filter((definition) => definition.path === path)
    return toCodeView("data", path, inFile.map((definition) => definition.lines), inFile.flatMap((definition) => marksOf(files, definition)), inFile.length)
  })
}

const eventLinesOf = (file: ASTGraphFile, root: Encapsulation, heldAt: SourceRange, handlers: readonly SourceRange[]): LineRange[] => {
  const element = findMarkupAt(file.listStatements(root), heldAt.start)
  return [[element?.range.start.line ?? heldAt.start.line, heldAt.end.line], ...handlers.map(linesOf)]
}

export const toEventView = (file: ASTGraphFile, root: Encapsulation, heldAt: SourceRange, handlers: readonly SourceRange[]): CodeView =>
  toCodeView("event", file.filePath, eventLinesOf(file, root, heldAt, handlers), toCodeSpans(file, heldAt), ONE_ENTRY)

const listEventViews = ({ file, component }: ViewedComponent, scope: SourceRange): CodeView[] => {
  const held = listEventRanges(file, component).filter((heldAt) => containsRange(scope, heldAt))
  if (held.length === 0) return []
  const lines = held.flatMap((heldAt) => eventLinesOf(file, component, heldAt, listHandedFunctionRanges(file, component, heldAt)))
  return [toCodeView("event", file.filePath, lines, held.flatMap((heldAt) => toCodeSpans(file, heldAt)), held.length)]
}

const toRenderView = ({ file, component }: ViewedComponent, scope: SourceRange): CodeView => {
  const returns = listReturnStatements(file, component).map((statement) => statement.range).filter((range) => containsRange(scope, range))
  const lines = returns.length === 0 ? [linesOf(scope)] : returns.map(linesOf)
  return toCodeView("render", file.filePath, lines, [], Math.max(returns.length, ONE_ENTRY))
}

export const listComponentViews = (viewed: ViewedComponent, scope: SourceRange): CodeView[] => [
  ...listDataViews(viewed, scope),
  ...listEventViews(viewed, scope),
  toRenderView(viewed, scope),
]
