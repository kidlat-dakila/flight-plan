import type { LineRange, SourceLine } from "@flightplan/configurations"
import type { Hunk, Removal } from "./hunks"

const LINE_BREAK = "\n"

const linesOf = (text: string): readonly string[] => {
  const lines = text.split(LINE_BREAK)
  return text.endsWith(LINE_BREAK) ? lines.slice(0, -1) : lines
}

const isInRanges = (ranges: readonly LineRange[], number: number): boolean =>
  ranges.some((range) => number >= range.lineStart && number <= range.lineEnd)

const toRemovedLines = (removals: readonly Removal[]): SourceLine[] =>
  removals.flatMap((removal) => removal.lines.map((text): SourceLine => ({ text, mark: "removed", number: null })))

export const buildSourceLines = (text: string | null, hunk: Hunk): SourceLine[] => {
  const lines = text === null ? [] : linesOf(text)
  const removedBefore = (number: number): SourceLine[] =>
    toRemovedLines(hunk.removed.filter((removal) => removal.afterLine === number - 1))
  const kept = lines.flatMap((lineText, index): SourceLine[] => [
    ...removedBefore(index + 1),
    { text: lineText, mark: isInRanges(hunk.added, index + 1) ? "added" : "context", number: index + 1 },
  ])
  return [...kept, ...toRemovedLines(hunk.removed.filter((removal) => removal.afterLine >= lines.length))]
}
