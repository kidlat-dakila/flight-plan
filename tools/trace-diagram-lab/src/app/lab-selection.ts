export interface LabSelection {
  readonly fixtureId: string | null
  readonly segmentId: string | null
  readonly tabId: string | null
}

interface Identified {
  readonly id: string
}

interface LabeledEntry {
  readonly source: string
  readonly kind: string
  readonly title: string
}

const FIXTURE_PARAMETER = "fixture"
const SEGMENT_PARAMETER = "segment"
const TAB_PARAMETER = "tab"
const LABEL_SEPARATOR = " / "
const STEP_BACK = -1
const STEP_FORWARD = 1
const FIRST_POSITION = 0
const MISSING_POSITION = -1

export const labSelectionOfSearch = (search: string): LabSelection => {
  const parameters = new URLSearchParams(search)
  return { fixtureId: parameters.get(FIXTURE_PARAMETER), segmentId: parameters.get(SEGMENT_PARAMETER), tabId: parameters.get(TAB_PARAMETER) }
}

export const searchOfLabSelection = ({ fixtureId, segmentId, tabId }: LabSelection): string => {
  const parameters = new URLSearchParams([
    ...(fixtureId === null ? [] : [[FIXTURE_PARAMETER, fixtureId]]),
    ...(segmentId === null ? [] : [[SEGMENT_PARAMETER, segmentId]]),
    ...(tabId === null ? [] : [[TAB_PARAMETER, tabId]]),
  ])
  const search = parameters.toString()
  return search === "" ? "" : `?${search}`
}

export const chosenOf = <Item extends Identified>(items: readonly Item[], requestedId: string | null): Item | null =>
  items.find((item) => item.id === requestedId) ?? items.at(0) ?? null

const steppedIdOf = (items: readonly Identified[], currentId: string | null, step: number): string | null => {
  const position = items.findIndex((item) => item.id === currentId)
  const steppedPosition = position + step
  return position === MISSING_POSITION || steppedPosition < FIRST_POSITION ? null : (items.at(steppedPosition)?.id ?? null)
}

export const previousIdOf = (items: readonly Identified[], currentId: string | null): string | null => steppedIdOf(items, currentId, STEP_BACK)

export const nextIdOf = (items: readonly Identified[], currentId: string | null): string | null => steppedIdOf(items, currentId, STEP_FORWARD)

export const fixtureLabelOf = ({ source, kind, title }: LabeledEntry): string => [source, kind, title].join(LABEL_SEPARATOR)

export interface SelectOption {
  readonly value: string
  readonly label: string
}

export const fixtureOptionsOf = (entries: readonly (Identified & LabeledEntry)[]): SelectOption[] =>
  entries.map((entry) => ({ value: entry.id, label: fixtureLabelOf(entry) }))

export const diagramOptionsOf = (diagrams: readonly (Identified & { readonly label: string })[]): SelectOption[] =>
  diagrams.map((diagram) => ({ value: diagram.id, label: diagram.label }))
