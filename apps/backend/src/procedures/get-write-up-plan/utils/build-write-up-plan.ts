import { countLabel } from "@/procedures/get-review/utils/count-label"
import {
  WALKTHROUGH_ORDERS,
  WRITE_UP_SECTIONS,
  type WalkthroughOrder,
  type WriteUpSection,
} from "@/procedures/get-review-preferences/utils/review-preferences"
import type { Configuration } from "@/procedures/list-configurations/utils/configuration"
import { joinedList } from "./joined-list"
import type { WriteUpPlan } from "./schemas"
import { WALKTHROUGH_ORDER_OFFERS, WRITE_UP_SECTION_LABELS } from "./write-up-catalog"
import type { WriteUpCounts } from "./write-up-counts"

export interface WriteUpPlanSource {
  readonly agentLabel: string
  readonly counts: WriteUpCounts
  readonly sections: readonly WriteUpSection[]
  readonly configurations: readonly Configuration[]
  readonly configurationId: string
  readonly walkthroughOrder: WalkthroughOrder
  readonly isSegmented: boolean
}

type FoundPlan = Extract<WriteUpPlan, { kind: "plan" }>

const NOTHING_TO_WRITE = "Nothing to write"
const NO_WAYPOINT_TO_CHECK = "No waypoint to check"
const NOTHING_CHOSEN = "Nothing"
const SEGMENTS_ON = "On"
const SEGMENTS_OFF = "Off"

const partsLabelOf = (count: number): string => (count === 0 ? NOTHING_TO_WRITE : countLabel(count, "part to write", "parts to write"))

const waypointsLabelOf = (count: number): string =>
  count === 0 ? NO_WAYPOINT_TO_CHECK : countLabel(count, "waypoint to check", "waypoints to check")

const countLabelOf = (section: WriteUpSection, count: number): string =>
  section === "findings" ? waypointsLabelOf(count) : partsLabelOf(count)

const totalLabelOf = (counts: WriteUpCounts, sections: readonly WriteUpSection[]): string => {
  const parts = sections.filter((section) => section !== "findings").reduce((total, section) => total + counts[section], 0)
  const checks = sections.includes("findings") ? counts.findings : 0
  if (parts === 0 && checks === 0) return NOTHING_TO_WRITE
  return joinedList([...(parts === 0 ? [] : [partsLabelOf(parts)]), ...(checks === 0 ? [] : [waypointsLabelOf(checks)])])
}

const chosenLabelOf = (sections: readonly WriteUpSection[]): string => {
  const labels = WRITE_UP_SECTIONS.filter((section) => sections.includes(section)).map((section) => WRITE_UP_SECTION_LABELS[section])
  return labels.length === 0 ? NOTHING_CHOSEN : joinedList(labels)
}

const configurationNameOf = (configurations: readonly Configuration[], id: string): string =>
  configurations.find((configuration) => configuration.id === id)?.name ?? id

export const buildWriteUpPlan = (source: WriteUpPlanSource): FoundPlan => ({
  kind: "plan",
  agentLabel: source.agentLabel,
  summary: [
    { label: "Write up", value: chosenLabelOf(source.sections) },
    { label: "Prompt configuration", value: configurationNameOf(source.configurations, source.configurationId) },
    { label: "Code Walkthrough order", value: WALKTHROUGH_ORDER_OFFERS[source.walkthroughOrder].label },
    { label: "Segments", value: source.isSegmented ? SEGMENTS_ON : SEGMENTS_OFF },
  ],
  sections: WRITE_UP_SECTIONS.map((section) => ({
    section,
    label: WRITE_UP_SECTION_LABELS[section],
    count: source.counts[section],
    countLabel: countLabelOf(section, source.counts[section]),
    isChosen: source.sections.includes(section),
  })),
  totalLabel: totalLabelOf(source.counts, source.sections),
  configurations: source.configurations.map((configuration) => ({ id: configuration.id, label: configuration.name })),
  configurationId: source.configurationId,
  walkthroughOrders: WALKTHROUGH_ORDERS.map((order) => ({ order, ...WALKTHROUGH_ORDER_OFFERS[order] })),
  walkthroughOrder: source.walkthroughOrder,
  isSegmented: source.isSegmented,
})
