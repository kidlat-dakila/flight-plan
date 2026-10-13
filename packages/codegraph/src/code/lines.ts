import type { CodeLine, CodeReference, CodeSpan, LineRange, LineSpan, SourceFile, SourceLine, TokenLine } from "@flightplan/configurations"

export interface HighlightedSource {
  readonly source: SourceFile
  readonly tokenLines: readonly TokenLine[]
}

export interface RowSpan {
  readonly start: number
  readonly end: number
}

const NOT_FOUND = -1

const isInRange = (line: SourceLine, range: LineRange): boolean =>
  line.number !== null && line.number >= range.lineStart && line.number <= range.lineEnd

const firstRemovedRowBefore = (lines: readonly SourceLine[], index: number): number =>
  index > 0 && lines[index - 1]?.mark === "removed" ? firstRemovedRowBefore(lines, index - 1) : index

export const rowSpanOf = (source: SourceFile, range: LineRange): RowSpan | null => {
  const first = source.lines.findIndex((line) => isInRange(line, range))
  const last = source.lines.reduce((found, line, index) => (isInRange(line, range) ? index : found), NOT_FOUND)
  return first === NOT_FOUND ? null : { start: firstRemovedRowBefore(source.lines, first), end: last }
}

export const isInSpan = (index: number, span: RowSpan | null): boolean =>
  span !== null && index >= span.start && index <= span.end

export interface LineDecorations {
  readonly marks: readonly CodeSpan[]
  readonly shownLines: readonly LineSpan[]
  readonly definitionIds: ReadonlySet<string>
}

const ID_SEPARATOR = ":"
const LIBRARY_ID_MARK = "library"
const CODE_ID_MARK = "code"
const FIRST_COLUMN = 1
const NO_DECORATIONS: LineDecorations = { marks: [], shownLines: [], definitionIds: new Set() }

export type DefinitionPlace = Pick<CodeReference, "path" | "lines" | "isLibrary" | "library">

const LANGUAGE_ID_MARK = "language"

export const definitionIdOf = ({ path, lines: [startLine, endLine], isLibrary, library }: DefinitionPlace): string =>
  [path, startLine, endLine, isLibrary ? LIBRARY_ID_MARK : CODE_ID_MARK, ...(library === undefined ? [] : [library.specifier, library.name])].join(ID_SEPARATOR)

export const languageDefinitionIdOf = (name: string): string => [LANGUAGE_ID_MARK, name].join(ID_SEPARATOR)

const columnSpanOf = ({ startColumn, endColumn }: CodeSpan): CodeLine["marks"][number] => ({
  fromColumn: startColumn + FIRST_COLUMN,
  toColumn: endColumn,
})

const isWithinSpans = ([startLine, endLine]: LineSpan, spans: readonly LineSpan[]): boolean =>
  spans.some(([shownStart, shownEnd]) => shownStart <= startLine && endLine <= shownEnd)

const isLookedUp = (reference: CodeReference, path: string, { shownLines, definitionIds }: LineDecorations): boolean =>
  definitionIds.has(definitionIdOf(reference)) && !(reference.path === path && isWithinSpans(reference.lines, shownLines))

export const removedLineNumberAt = (lines: readonly SourceLine[], index: number): number | null =>
  lines.some((line, position) => position === index && line.mark === "removed")
    ? lines.slice(0, index).filter((line) => line.mark !== "added").length + 1
    : null

const numberLabelOf = (number: number | null): string => (number === null ? "" : String(number))

const toCodeLine = (
  { path, references, languageReferences }: SourceFile,
  line: SourceLine,
  removedNumber: number | null,
  tokens: TokenLine,
  isFocused: boolean,
  decorations: LineDecorations,
): CodeLine => ({
  numberLabel: numberLabelOf(line.number),
  removedNumberLabel: numberLabelOf(removedNumber),
  mark: line.mark,
  isFocused,
  tokens: [...tokens],
  marks: decorations.marks.filter((mark) => mark.line === line.number).map(columnSpanOf),
  references: [
    ...references
      .filter((reference) => reference.line === line.number && isLookedUp(reference, path, decorations))
      .map((reference) => ({ ...columnSpanOf(reference), definitionId: definitionIdOf(reference) })),
    ...languageReferences
      .filter((reference) => reference.line === line.number && decorations.definitionIds.has(languageDefinitionIdOf(reference.name)))
      .map((reference) => ({ ...columnSpanOf(reference), definitionId: languageDefinitionIdOf(reference.name) })),
  ],
})

export const codeLinesIn = (
  highlighted: HighlightedSource,
  span: RowSpan,
  focus: RowSpan | null,
  decorations: LineDecorations = NO_DECORATIONS,
): CodeLine[] =>
  highlighted.source.lines
    .map((line, index) => ({ line, index }))
    .filter(({ index }) => isInSpan(index, span))
    .map(({ line, index }) =>
      toCodeLine(
        highlighted.source,
        line,
        removedLineNumberAt(highlighted.source.lines, index),
        highlighted.tokenLines[index] ?? [],
        isInSpan(index, focus),
        decorations,
      ))

export const lineSpansIn = ({ lines }: SourceFile, spans: readonly RowSpan[]): LineSpan[] =>
  spans.flatMap((span): LineSpan[] => {
    const numbers = lines.flatMap((line, index) => (isInSpan(index, span) && line.number !== null ? [line.number] : []))
    return numbers.length === 0 ? [] : [[Math.min(...numbers), Math.max(...numbers)]]
  })

export const findSource = (
  sources: readonly HighlightedSource[],
  path: string,
): HighlightedSource | null => sources.find((highlighted) => highlighted.source.path === path) ?? null
