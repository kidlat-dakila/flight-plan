import type { ScriptBlock } from "./sfc"

export interface Splice {
  readonly from: number
  readonly content: string
}

interface Written {
  readonly text: string
  readonly end: number
}

const LINE_BREAK = "\n"
const BLANK = " "

const blanked = (text: string): string =>
  text
    .split(LINE_BREAK)
    .map((line) => BLANK.repeat(line.length))
    .join(LINE_BREAK)

export const writeOverBlanks = (source: string, splices: readonly Splice[]): string => {
  const blank = blanked(source)
  const ordered = [...splices].sort((one, two) => one.from - two.from)
  const { text, end } = ordered.reduce<Written>(
    (written, { from, content }) => ({ text: `${written.text}${blank.slice(written.end, from)}${content}`, end: from + content.length }),
    { text: "", end: 0 },
  )
  return `${text}${blank.slice(end)}`
}

export const scriptTextOf = (source: string, { body }: ScriptBlock): string => writeOverBlanks(source, [{ from: body.startIndex, content: body.text }])
