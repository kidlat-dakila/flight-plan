import type { FileSection, LineRange, Waypoint } from "@flightplan/configurations"
import type { DeclarationSpan } from "./declarations"
import type { Hunk } from "./hunks"

export interface ChangedFile {
  readonly path: string
  readonly hunk: Hunk
  readonly declarations: readonly DeclarationSpan[] | null
}

export interface ScaffoldedFile {
  readonly section: FileSection
  readonly anchors: Readonly<Record<string, LineRange>>
}

interface Stop {
  readonly name: string
  readonly range: LineRange
}

const LISTED_NAME_LIMIT = 3
const NAME_SEPARATOR = ", "
const RANGE_DASH = "–"

const overlaps = (span: LineRange, range: LineRange): boolean =>
  range.lineStart <= span.lineEnd && range.lineEnd >= span.lineStart

const isStrictlyInside = (inner: LineRange, outer: LineRange): boolean =>
  inner.lineStart >= outer.lineStart
  && inner.lineEnd <= outer.lineEnd
  && (inner.lineStart > outer.lineStart || inner.lineEnd < outer.lineEnd)

const isInsideCallable = (declaration: DeclarationSpan, all: readonly DeclarationSpan[]): boolean =>
  all.some((holder) => holder.kind === "callable" && holder !== declaration && isStrictlyInside(declaration, holder))

const holdsTouchedDeclaration = (
  declaration: DeclarationSpan,
  candidates: readonly DeclarationSpan[],
  range: LineRange,
): boolean =>
  candidates.some((other) => other !== declaration && isStrictlyInside(other, declaration) && overlaps(other, range))

export const touchedDeclarations = (declarations: readonly DeclarationSpan[], range: LineRange): DeclarationSpan[] => {
  const outside = declarations
    .filter((declaration) => overlaps(declaration, range))
    .filter((declaration) => !isInsideCallable(declaration, declarations))
  return outside.filter((declaration) => !holdsTouchedDeclaration(declaration, outside, range))
}

const rangeName = (range: LineRange): string => `Lines ${String(range.lineStart)}${RANGE_DASH}${String(range.lineEnd)}`

const listedName = (names: readonly string[]): string =>
  names.length <= LISTED_NAME_LIMIT
    ? names.join(NAME_SEPARATOR)
    : `${names.slice(0, LISTED_NAME_LIMIT).join(NAME_SEPARATOR)} +${String(names.length - LISTED_NAME_LIMIT)} more`

const stopFor = (declarations: readonly DeclarationSpan[] | null, range: LineRange): Stop => {
  const touched = declarations === null ? [] : touchedDeclarations(declarations, range)
  const [only] = touched
  if (touched.length === 1) return { name: only.name, range: { lineStart: only.lineStart, lineEnd: only.lineEnd } }
  return { name: touched.length === 0 ? rangeName(range) : listedName(touched.map((declaration) => declaration.name)), range }
}

const isSameStop = (first: Stop, second: Stop): boolean =>
  first.name === second.name && first.range.lineStart === second.range.lineStart && first.range.lineEnd === second.range.lineEnd

const withoutRepeats = (stops: readonly Stop[]): Stop[] =>
  stops.filter((stop, index) => stops.findIndex((earlier) => isSameStop(earlier, stop)) === index)

const withDistinctNames = (stops: readonly Stop[]): Stop[] =>
  stops.map((stop, index) => {
    const earlierCount = stops.slice(0, index).filter((earlier) => earlier.name === stop.name).length
    return earlierCount === 0 ? stop : { ...stop, name: `${stop.name} (${String(earlierCount + 1)})` }
  })

const byFirstLine = (first: LineRange, second: LineRange): number => first.lineStart - second.lineStart

const stopsOf = (file: ChangedFile): Stop[] =>
  withDistinctNames(
    withoutRepeats([...file.hunk.added].sort(byFirstLine).map((range) => stopFor(file.declarations, range))),
  )

const toWaypoint = (stop: Stop, id: string): Waypoint => ({
  id,
  title: null,
  declaration: stop.name,
  reading: "",
  needsAttention: null,
  findings: [],
  children: [],
})

const scaffoldFile = (file: ChangedFile, firstWaypointNumber: number): ScaffoldedFile => {
  const stops = stopsOf(file)
  return {
    section: {
      path: file.path,
      title: file.path,
      summary: [],
      waypoints: stops.map((stop, index) => toWaypoint(stop, `w${String(firstWaypointNumber + index)}`)),
    },
    anchors: Object.fromEntries(stops.map((stop) => [stop.name, stop.range])),
  }
}

export const scaffoldFiles = (files: readonly ChangedFile[]): ScaffoldedFile[] =>
  files
    .filter((file) => file.hunk.added.length > 0)
    .reduce<ScaffoldedFile[]>((scaffolded, file) => {
      const waypointCount = scaffolded.reduce((count, done) => count + done.section.waypoints.length, 0)
      return [...scaffolded, scaffoldFile(file, waypointCount + 1)]
    }, [])
