import type { WalkthroughControls } from "@flightplan/ui/lib/walkthrough-navigation"

type WaypointFilter = WalkthroughControls["filter"]

type FilterOption = WaypointFilter["groups"][number]["options"][number]

interface FilteredWaypoint {
  readonly id: string
  readonly isReviewed: boolean
}

type FilteredRow = { readonly kind: "waypoint", readonly waypoint: FilteredWaypoint } | { readonly kind: "lines" | "gap" }

export interface FilteredSegment {
  readonly walkthrough: {
    readonly controls: WalkthroughControls
    readonly files: readonly { readonly rows: readonly FilteredRow[] }[]
  }
}

const optionsOf = (filter: WaypointFilter): FilterOption[] => [
  ...filter.groups.flatMap((group) => [...group.options, ...(group.more?.options ?? [])]),
  ...filter.submenus.flatMap((submenu) => submenu.options),
]

export const tickedFilterKeysOf = (filter: WaypointFilter): string[] =>
  optionsOf(filter).filter((option) => option.isSelected).map((option) => option.key)

const hasSameKeys = (one: readonly string[], two: readonly string[]): boolean =>
  one.length === two.length && one.every((key) => two.includes(key))

export const isFilterApplied = (segments: readonly FilteredSegment[], keys: readonly string[]): boolean =>
  segments.every((segment) => hasSameKeys(tickedFilterKeysOf(segment.walkthrough.controls.filter), keys))

export const firstUnreviewedWaypointIdOf = (segments: readonly FilteredSegment[]): string | null =>
  segments
    .flatMap((segment) => segment.walkthrough.files)
    .flatMap((file) => file.rows)
    .flatMap((row) => (row.kind === "waypoint" && !row.waypoint.isReviewed ? [row.waypoint.id] : []))
    .at(0) ?? null
