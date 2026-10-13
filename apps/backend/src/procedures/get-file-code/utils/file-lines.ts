import type { CodeLine, SourceFile, TokenLine } from "@flightplan/configurations"

export interface FileLine {
  readonly number: number
  readonly text: string
  readonly mark: "context" | "added"
}

const LINE_BREAK = "\n"

const toHeldLine = ({ number, text, mark }: SourceFile["lines"][number]): FileLine[] =>
  number === null ? [] : [{ number, text, mark: mark === "added" ? "added" : "context" }]

export const heldLinesOf = (source: SourceFile): FileLine[] => source.lines.flatMap(toHeldLine)

export const textLinesOf = (text: string): FileLine[] => {
  const texts = text.split(LINE_BREAK)
  const kept = text.endsWith(LINE_BREAK) ? texts.slice(0, -1) : texts
  return kept.map((lineText, index) => ({ number: index + 1, text: lineText, mark: "context" }))
}

export const toCodeLines = (lines: readonly FileLine[], tokenLines: readonly TokenLine[]): CodeLine[] =>
  lines.map((line, index) => ({
    numberLabel: String(line.number),
    removedNumberLabel: "",
    mark: line.mark,
    isFocused: false,
    tokens: [...(tokenLines[index] ?? [{ text: line.text, kind: "plain" }])],
    marks: [],
    references: [],
  }))
