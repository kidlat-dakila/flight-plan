import { countLabel } from "@/procedures/get-review/utils/count-label"
import type { DiagramSettings } from "@/procedures/get-review/utils/journey/filter"
import type { ConnectionCertainty } from "@/procedures/get-review/utils/review-artifact"
import type { DiagramConfiguration, DiagramRequest, EdgeLegend } from "@/procedures/get-review/utils/schemas"

export const DEFAULT_DIAGRAM_SETTINGS: DiagramSettings = {
  levels: null,
  isShowingData: false,
  isShowingAssumed: true,
}

export const selectDiagramSettings = (request: DiagramRequest): DiagramSettings => ({
  levels: request.levels,
  isShowingData: request.isShowingData ?? DEFAULT_DIAGRAM_SETTINGS.isShowingData,
  isShowingAssumed: request.isShowingAssumed ?? DEFAULT_DIAGRAM_SETTINGS.isShowingAssumed,
})

interface CountableEdge {
  readonly kind: string
  readonly certainty: ConnectionCertainty
}

export interface LevelControl {
  readonly label: string
  readonly allLabel: string
  readonly levelLabels: readonly string[]
}

const levelOptions = (control: LevelControl, settings: DiagramSettings): NonNullable<DiagramConfiguration["levels"]>["options"] => [
  { label: control.allLabel, value: null, isSelected: settings.levels === null },
  ...control.levelLabels.map((label, value) => ({ label, value, isSelected: settings.levels === value })),
]

const toggleOf = (
  key: "data" | "assumed",
  label: string,
  connectionCount: number,
  isOn: boolean,
): DiagramConfiguration["toggles"] =>
  connectionCount === 0
    ? []
    : [{ key, label, countLabel: countLabel(connectionCount, "connection", "connections"), isOn }]

export const buildDiagramConfiguration = (
  label: string,
  control: LevelControl,
  edges: readonly CountableEdge[],
  settings: DiagramSettings,
): DiagramConfiguration => ({
  label,
  levels: control.levelLabels.length === 0 ? null : { label: control.label, options: levelOptions(control, settings) },
  toggles: [
    ...toggleOf("data", "Data connections", edges.filter((edge) => edge.kind === "data").length, settings.isShowingData),
    ...toggleOf(
      "assumed",
      "Assumed connections",
      edges.filter((edge) => edge.certainty === "assumed").length,
      settings.isShowingAssumed,
    ),
  ],
})

export const EDGE_LEGEND: EdgeLegend = [
  { kind: "call", label: "Calls" },
  { kind: "value", label: "Handed over as a value" },
  { kind: "data", label: "Uses its data" },
  { kind: "assumed", label: "Assumed" },
]
