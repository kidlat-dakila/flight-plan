import type { LineMark, LineRange, SourceFile, SourceLine } from "@flightplan/configurations"

const REGION_START = "#region "
const REGION_END = "#endregion "
const MARK_WIDTH = 1
const FIRST_LINE_NUMBER = 1

const MARK_BY_SYMBOL: Readonly<Record<string, LineMark>> = {
  "+": "added",
  "-": "removed",
  " ": "context",
}

interface ParsedSource {
  readonly lines: readonly SourceLine[]
  readonly nextNumber: number
  readonly openRegions: Readonly<Record<string, number>>
  readonly declarations: Readonly<Record<string, LineRange>>
}

const EMPTY_SOURCE: ParsedSource = {
  lines: [],
  nextNumber: FIRST_LINE_NUMBER,
  openRegions: {},
  declarations: {},
}

const withRegionOpened = (source: ParsedSource, name: string): ParsedSource => ({
  ...source,
  openRegions: { ...source.openRegions, [name]: source.nextNumber },
})

const withRegionClosed = (source: ParsedSource, name: string): ParsedSource => ({
  ...source,
  declarations: {
    ...source.declarations,
    [name]: { lineStart: source.openRegions[name] ?? source.nextNumber, lineEnd: source.nextNumber - 1 },
  },
})

const withLine = (source: ParsedSource, markedLine: string): ParsedSource => {
  const mark = MARK_BY_SYMBOL[markedLine.charAt(0)] ?? "context"
  const text = markedLine.slice(MARK_WIDTH)
  return mark === "removed"
    ? { ...source, lines: [...source.lines, { text, mark, number: null }] }
    : {
        ...source,
        lines: [...source.lines, { text, mark, number: source.nextNumber }],
        nextNumber: source.nextNumber + 1,
      }
}

const withMarkedLine = (source: ParsedSource, markedLine: string): ParsedSource => {
  if (markedLine.startsWith(REGION_START)) return withRegionOpened(source, markedLine.slice(REGION_START.length))
  if (markedLine.startsWith(REGION_END)) return withRegionClosed(source, markedLine.slice(REGION_END.length))
  return withLine(source, markedLine)
}

export const parseMarkedSource = (path: string, language: string, markedText: string): SourceFile => {
  const parsed = markedText.split("\n").reduce(withMarkedLine, EMPTY_SOURCE)
  return { path, language, lines: parsed.lines, declarations: parsed.declarations }
}
