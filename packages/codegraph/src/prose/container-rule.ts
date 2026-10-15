import type MarkdownIt from "markdown-it"
import type { StateBlock } from "markdown-it"

const CLOSE_LINE = ":::"
const TERMINATED_RULES = ["paragraph", "reference", "blockquote", "list"]

interface ContainerSpec {
  readonly name: string
  readonly itemName: string
  readonly openLine: string
  readonly itemPattern: RegExp
}

export const TABS_CONTAINER: ContainerSpec = {
  name: "tabs",
  itemName: "tab",
  openLine: ":::tabs",
  itemPattern: /^::tab[ \t]+(\S.*?)$/,
}

export const ACCORDION_CONTAINER: ContainerSpec = {
  name: "accordion",
  itemName: "section",
  openLine: ":::accordion",
  itemPattern: /^::section[ \t]+(\S.*?)$/,
}

interface ItemRange {
  readonly label: string
  readonly bodyStart: number
  readonly bodyEnd: number
}

interface ContainerBlock {
  readonly items: readonly ItemRange[]
  readonly closeLine: number
}

const linesBetween = (start: number, end: number): number[] =>
  Array.from({ length: Math.max(0, end - start) }, (_, offset) => start + offset)

const lineTextOf = (state: StateBlock, line: number): string =>
  state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]).trimEnd()

const isAtBlockIndent = (state: StateBlock, line: number): boolean => state.sCount[line] === state.blkIndent

const isBlank = (state: StateBlock, line: number): boolean => lineTextOf(state, line) === ""

const isMarkerLine = (state: StateBlock, line: number, text: string): boolean =>
  isAtBlockIndent(state, line) && lineTextOf(state, line) === text

const itemLabelAt = (spec: ContainerSpec, state: StateBlock, line: number): string | null => {
  if (!isAtBlockIndent(state, line)) return null
  return spec.itemPattern.exec(lineTextOf(state, line))?.[1] ?? null
}

const lineAfter = (lines: readonly number[], position: number, fallback: number): number =>
  position + 1 < lines.length ? lines[position + 1] : fallback

const toItemRanges = (spec: ContainerSpec, state: StateBlock, itemLines: readonly number[], closeLine: number): ItemRange[] =>
  itemLines.map((line, position) => ({
    label: itemLabelAt(spec, state, line) ?? "",
    bodyStart: line + 1,
    bodyEnd: lineAfter(itemLines, position, closeLine),
  }))

const findContainer = (spec: ContainerSpec, state: StateBlock, startLine: number, endLine: number): ContainerBlock | null => {
  if (!isMarkerLine(state, startLine, spec.openLine)) return null
  const closeLine = linesBetween(startLine + 1, endLine).find((line) => isMarkerLine(state, line, CLOSE_LINE))
  if (closeLine === undefined) return null
  const innerLines = linesBetween(startLine + 1, closeLine)
  const firstFilledLine = innerLines.find((line) => !isBlank(state, line))
  const itemLines = innerLines.filter((line) => itemLabelAt(spec, state, line) !== null)
  if (firstFilledLine === undefined || itemLines[0] !== firstFilledLine) return null
  return { items: toItemRanges(spec, state, itemLines, closeLine), closeLine }
}

const pushItem = (spec: ContainerSpec, state: StateBlock, { label, bodyStart, bodyEnd }: ItemRange): void => {
  const opening = state.push(`${spec.itemName}_open`, "section", 1)
  // eslint-disable-next-line functional/immutable-data -- markdown-it carries a token's extra text on its info
  opening.info = label
  const lineMax = state.lineMax
  // eslint-disable-next-line functional/immutable-data, no-param-reassign -- markdown-it bounds a nested tokenize by the line limit of its state
  state.lineMax = bodyEnd
  state.md.block.tokenize(state, bodyStart, bodyEnd)
  // eslint-disable-next-line functional/immutable-data, no-param-reassign -- the line limit goes back once the item is read
  state.lineMax = lineMax
  state.push(`${spec.itemName}_close`, "section", -1)
}

const containerRuleOf = (spec: ContainerSpec) =>
  (state: StateBlock, startLine: number, endLine: number, isSilent: boolean): boolean => {
    const block = findContainer(spec, state, startLine, endLine)
    if (block === null) return false
    if (isSilent) return true
    state.push(`${spec.name}_open`, "div", 1)
    block.items.forEach((item) => {
      pushItem(spec, state, item)
    })
    state.push(`${spec.name}_close`, "div", -1)
    // eslint-disable-next-line functional/immutable-data, no-param-reassign -- a markdown-it block rule reports the line it read up to on its state
    state.line = block.closeLine + 1
    return true
  }

export const containerPluginOf = (spec: ContainerSpec) => (markdown: MarkdownIt): void => {
  markdown.block.ruler.before("fence", spec.name, containerRuleOf(spec), { alt: TERMINATED_RULES })
}
