import { countLabel } from "@/prose/count-label"
import { compareRootBlockKeys, isRootBlockKey, rootBlockLabelOf, rootBlockLabelsOf, type RootBlockKey } from "@/walkthrough/root-blocks"
import { CORE_CHANGE_LABEL, FINDING_KIND_LABELS, type FlatWaypoint } from "@/walkthrough/waypoints"
import {
  WAYPOINT_CHANGES,
  WAYPOINT_FILTER_KEYS,
  WAYPOINT_FINDING_FILTER_KEYS,
  type WaypointChange,
  type WaypointFilter,
  type WaypointFilterKey,
} from "@flightplan/configurations"

export type FilterKey = WaypointFilterKey | RootBlockKey

type FilterOption = WaypointFilter["submenus"][number]["options"][number]

interface FilterGroup {
  readonly isMember: (key: FilterKey) => boolean
}

const WAYPOINT_CHANGE_LABELS: Readonly<Record<WaypointChange, string>> = {
  added: "Added",
  modified: "Modified",
  removed: "Removed",
}

const FILTER_LABELS: Readonly<Record<WaypointFilterKey, string>> = {
  "core-change": CORE_CHANGE_LABEL,
  ...FINDING_KIND_LABELS,
  ...WAYPOINT_CHANGE_LABELS,
}

const isFilterKey = (key: string): key is WaypointFilterKey =>
  WAYPOINT_FILTER_KEYS.some((filterKey) => filterKey === key)

const isFindingKey = (key: FilterKey): boolean =>
  WAYPOINT_FINDING_FILTER_KEYS.some((findingKey) => findingKey === key)

const isChangeKey = (key: FilterKey): key is WaypointChange =>
  WAYPOINT_CHANGES.some((change) => change === key)

const FINDING_GROUP: FilterGroup = { isMember: isFindingKey }
const ROOT_BLOCK_GROUP: FilterGroup = { isMember: isRootBlockKey }
const CHANGE_GROUP: FilterGroup = { isMember: isChangeKey }
const FILTER_GROUPS: readonly FilterGroup[] = [FINDING_GROUP, ROOT_BLOCK_GROUP, CHANGE_GROUP]

const FINDING_GROUP_ID = "finding"
const ROOT_BLOCK_GROUP_ID = "block"
const MORE_ROOT_BLOCKS_ID = "more-blocks"
const MORE_LABEL = "More"
const ROOT_BLOCKS_HEADING = "Code blocks"
const SHOWN_ROOT_BLOCK_COUNT = 4
const CHANGE_SUBMENU_ID = "change"
const CHANGE_SUBMENU_LABEL = "Change type"
const FILTER_BUTTON_LABEL = "Filter"
const FILTER_HEADING = "Show waypoints with"
const SUBMENU_VALUE_SEPARATOR = ", "

const labelOf = (key: FilterKey): string => (isRootBlockKey(key) ? rootBlockLabelOf(key) : FILTER_LABELS[key])

export const selectFilterKeys = (requested: readonly string[] | null): FilterKey[] => [
  ...WAYPOINT_FILTER_KEYS.filter((key) => (requested ?? []).filter(isFilterKey).includes(key)),
  ...new Set((requested ?? []).filter(isRootBlockKey)),
]

const matchesKey = (flat: FlatWaypoint, key: FilterKey): boolean => {
  if (key === "core-change") return flat.waypoint.coreChange !== null
  if (isChangeKey(key)) return flat.change === key
  if (isRootBlockKey(key)) return flat.rootBlockKeys.includes(key)
  return flat.waypoint.findings.some((finding) => finding.kind === key)
}

const tickedIn = (group: FilterGroup, selected: readonly FilterKey[]): FilterKey[] => selected.filter(group.isMember)

const matchesGroup = (flat: FlatWaypoint, selected: readonly FilterKey[]) => (group: FilterGroup): boolean => {
  const ticked = tickedIn(group, selected)
  return ticked.length === 0 || ticked.some((key) => matchesKey(flat, key))
}

export const matchesFilter = (flat: FlatWaypoint, selected: readonly FilterKey[]): boolean =>
  FILTER_GROUPS.every(matchesGroup(flat, selected))

const toggledKeys = (selected: readonly FilterKey[], key: FilterKey): FilterKey[] =>
  selectFilterKeys(selected.includes(key) ? selected.filter((candidate) => candidate !== key) : [...selected, key])

const badgeOf = (selected: readonly FilterKey[]): WaypointFilter["badge"] =>
  selected.length === 0 ? null : { count: selected.length, label: countLabel(selected.length, "filter", "filters") }

const tickedLabel = (keys: readonly FilterKey[], selected: readonly FilterKey[]): string | null => {
  const ticked = keys.filter((key) => selected.includes(key))
  return ticked.length === 0 ? null : ticked.map(labelOf).join(SUBMENU_VALUE_SEPARATOR)
}

const countOf = (waypoints: readonly FlatWaypoint[], key: FilterKey): number => waypoints.filter((flat) => matchesKey(flat, key)).length

const filterOptionOf = (waypoints: readonly FlatWaypoint[], selected: readonly FilterKey[]) => (key: FilterKey): FilterOption => {
  const rootBlockLabels = isRootBlockKey(key) ? rootBlockLabelsOf(key) : null
  return {
    key,
    label: rootBlockLabels?.typeLabel ?? labelOf(key),
    detailLabel: rootBlockLabels?.changeLabel ?? countLabel(countOf(waypoints, key), "waypoint", "waypoints"),
    detailChange: rootBlockLabels?.change ?? null,
    isSelected: selected.includes(key),
    toggledKeys: toggledKeys(selected, key),
  }
}

const rootBlockKeysByCount = (waypoints: readonly FlatWaypoint[], selected: readonly FilterKey[]): RootBlockKey[] => {
  const byCount = (one: RootBlockKey, two: RootBlockKey): number => countOf(waypoints, two) - countOf(waypoints, one) || compareRootBlockKeys(one, two)
  return [...new Set([...waypoints.flatMap((flat) => flat.rootBlockKeys), ...selected.filter(isRootBlockKey)])].sort(byCount)
}

const rootBlockGroupOf = (waypoints: readonly FlatWaypoint[], selected: readonly FilterKey[]): WaypointFilter["groups"][number] => {
  const keys = rootBlockKeysByCount(waypoints, selected)
  const isShown = (key: RootBlockKey, position: number): boolean => position < SHOWN_ROOT_BLOCK_COUNT || selected.includes(key)
  const shown = keys.filter(isShown)
  const others = keys.filter((key, position) => !isShown(key, position))
  const optionOf = filterOptionOf(waypoints, selected)
  return {
    id: ROOT_BLOCK_GROUP_ID,
    options: shown.map(optionOf),
    more: others.length === 0
      ? null
      : { id: MORE_ROOT_BLOCKS_ID, label: MORE_LABEL, heading: ROOT_BLOCKS_HEADING, valueLabel: tickedLabel(others, selected), options: others.map(optionOf) },
  }
}

export const buildWaypointFilter = (
  waypoints: readonly FlatWaypoint[],
  selected: readonly FilterKey[],
): WaypointFilter => ({
  buttonLabel: FILTER_BUTTON_LABEL,
  badge: badgeOf(selected),
  heading: FILTER_HEADING,
  groups: [
    { id: FINDING_GROUP_ID, options: WAYPOINT_FINDING_FILTER_KEYS.map(filterOptionOf(waypoints, selected)), more: null },
    rootBlockGroupOf(waypoints, selected),
  ],
  submenus: [{
    id: CHANGE_SUBMENU_ID,
    label: CHANGE_SUBMENU_LABEL,
    heading: CHANGE_SUBMENU_LABEL,
    valueLabel: tickedLabel(WAYPOINT_CHANGES, selected),
    options: WAYPOINT_CHANGES.map(filterOptionOf(waypoints, selected)),
  }],
})
