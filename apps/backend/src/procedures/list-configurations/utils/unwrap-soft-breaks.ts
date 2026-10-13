const LINE_BREAK = "\n"
const FENCE = "```"
const BLOCK_START = /^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\||```)/
const UNJOINABLE_END = /^(?:#{1,6}\s|\||```)/

interface Unwrapping {
  readonly lines: readonly string[]
  readonly isInFence: boolean
}

const isFence = (line: string): boolean => line.trimStart().startsWith(FENCE)

const continues = (previousLine: string | undefined, line: string): boolean =>
  previousLine !== undefined
  && previousLine.trim() !== ""
  && line.trim() !== ""
  && !BLOCK_START.test(line.trimStart())
  && !UNJOINABLE_END.test(previousLine.trimStart())

const addLine = ({ lines, isInFence }: Unwrapping, line: string): Unwrapping => {
  if (isInFence || isFence(line)) return { lines: [...lines, line], isInFence: isFence(line) ? !isInFence : isInFence }
  const previousLine = lines.at(-1)
  return continues(previousLine, line)
    ? { lines: [...lines.slice(0, -1), `${previousLine ?? ""} ${line.trim()}`], isInFence }
    : { lines: [...lines, line], isInFence }
}

export const unwrapSoftBreaks = (markdown: string): string =>
  markdown.split(LINE_BREAK).reduce(addLine, { lines: [], isInFence: false }).lines.join(LINE_BREAK)
