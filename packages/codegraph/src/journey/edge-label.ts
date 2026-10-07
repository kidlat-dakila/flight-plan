import type { JourneyEdge } from "@flightplan/configurations"

const EDGE_KIND_LABELS: Readonly<Record<JourneyEdge["kind"], string | null>> = {
  trigger: null,
  call: null,
  value: "value",
  data: "data",
}

const ASSUMED_LABEL = "assumed"
const LABEL_SEPARATOR = ", "
const NAME_SEPARATOR = ", "

const handOverLabel = (edge: JourneyEdge): string | null =>
  edge.through.length === 0 ? EDGE_KIND_LABELS[edge.kind] : `through ${edge.through.join(NAME_SEPARATOR)}`

export const edgeLabelOf = (edge: JourneyEdge): string | null => {
  const parts = [handOverLabel(edge), edge.condition, edge.certainty === "assumed" ? ASSUMED_LABEL : null].filter((part) => part !== null)
  return parts.length === 0 ? null : parts.join(LABEL_SEPARATOR)
}
