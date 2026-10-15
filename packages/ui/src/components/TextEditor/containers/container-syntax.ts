export interface ContainerItemSource {
  readonly label: string
  readonly body: string
}

export interface ContainerSource {
  readonly raw: string
  readonly items: readonly ContainerItemSource[]
}

export interface ContainerMarkers {
  readonly openLine: string
  readonly itemPrefix: string
  readonly startPattern: RegExp
  readonly itemPattern: RegExp
}

export const TABS_MARKERS: ContainerMarkers = {
  openLine: ":::tabs",
  itemPrefix: "::tab ",
  startPattern: /^:::tabs[ \t]*$/m,
  itemPattern: /^::tab[ \t]+(\S.*?)$/,
}

export const ACCORDION_MARKERS: ContainerMarkers = {
  openLine: ":::accordion",
  itemPrefix: "::section ",
  startPattern: /^:::accordion[ \t]*$/m,
  itemPattern: /^::section[ \t]+(\S.*?)$/,
}

const CLOSE_LINE = ":::"
const LINE_BREAK = "\n"

const itemLabelOf = (markers: ContainerMarkers, line: string): string | null => markers.itemPattern.exec(line)?.[1] ?? null

const toItemSources = (markers: ContainerMarkers, innerLines: readonly string[], itemPositions: readonly number[]): ContainerItemSource[] =>
  itemPositions.map((position, order) => ({
    label: itemLabelOf(markers, innerLines[position]) ?? "",
    body: innerLines.slice(position + 1, itemPositions.at(order + 1) ?? innerLines.length).join(LINE_BREAK).trim(),
  }))

export const parseContainerSource = (source: string, markers: ContainerMarkers): ContainerSource | null => {
  const sourceLines = source.split(LINE_BREAK)
  const lines = sourceLines.map((line) => line.trimEnd())
  if (lines[0] !== markers.openLine) return null
  const closeIndex = lines.findIndex((line, index) => index > 0 && line === CLOSE_LINE)
  if (closeIndex < 0) return null
  const innerLines = lines.slice(1, closeIndex)
  const firstFilled = innerLines.findIndex((line) => line !== "")
  const itemPositions = innerLines.flatMap((line, position) => (itemLabelOf(markers, line) === null ? [] : [position]))
  if (firstFilled < 0 || itemPositions.at(0) !== firstFilled) return null
  const hasLineBreakAfter = sourceLines.length > closeIndex + 1
  return {
    raw: `${sourceLines.slice(0, closeIndex + 1).join(LINE_BREAK)}${hasLineBreakAfter ? LINE_BREAK : ""}`,
    items: toItemSources(markers, innerLines, itemPositions),
  }
}

export const formatContainer = (items: readonly ContainerItemSource[], markers: ContainerMarkers): string =>
  [
    markers.openLine,
    ...items.flatMap(({ label, body }) => [`${markers.itemPrefix}${label}`, ...(body === "" ? [] : [body])]),
    CLOSE_LINE,
  ].join(LINE_BREAK)
