export interface LineRange {
  readonly lineStart: number
  readonly lineEnd: number
}

export interface LineSelection {
  readonly anchorLine: number
  readonly headLine: number
}

export const selectLine = (selection: LineSelection | null, lineNumber: number, isExtending: boolean): LineSelection =>
  selection !== null && isExtending
    ? { anchorLine: selection.anchorLine, headLine: lineNumber }
    : { anchorLine: lineNumber, headLine: lineNumber }

export const rangeOfSelection = ({ anchorLine, headLine }: LineSelection): LineRange => ({
  lineStart: Math.min(anchorLine, headLine),
  lineEnd: Math.max(anchorLine, headLine),
})

export const isLineInRange = (range: LineRange | null, lineNumber: number): boolean =>
  range !== null && lineNumber >= range.lineStart && lineNumber <= range.lineEnd

export const lineLabelsIn = (range: LineRange | null): ReadonlySet<string> =>
  new Set(range === null ? [] : Array.from({ length: range.lineEnd - range.lineStart + 1 }, (_line, index) => String(range.lineStart + index)))

export const rangeLabelOf = ({ lineStart, lineEnd }: LineRange): string =>
  lineStart === lineEnd ? `Line ${String(lineStart)}` : `Lines ${String(lineStart)} to ${String(lineEnd)}`
