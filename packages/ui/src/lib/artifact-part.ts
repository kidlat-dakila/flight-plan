export type ArtifactPart
  = | { readonly kind: "review" }
    | { readonly kind: "segment", readonly segmentId: string }
    | { readonly kind: "waypoint", readonly waypointId: string }
    | { readonly kind: "trace-diagram", readonly segmentId: string }
    | { readonly kind: "trace-node", readonly segmentId: string, readonly nodeId: string }
    | { readonly kind: "blast-node", readonly segmentId: string, readonly path: string }
    | { readonly kind: "context-code-block", readonly blockId: string }

export type MarkedPartKind = Exclude<ArtifactPart["kind"], "review" | "segment">

export interface ArtifactPartMark {
  readonly "data-artifact-part": MarkedPartKind
  readonly "data-artifact-id"?: string
}

export interface SegmentMark {
  readonly "data-segment-id": string
}

const PART_SELECTOR = "[data-artifact-part]"
const SEGMENT_SELECTOR = "[data-segment-id]"

export const artifactPartMark = (kind: MarkedPartKind, id?: string): ArtifactPartMark =>
  id === undefined ? { "data-artifact-part": kind } : { "data-artifact-part": kind, "data-artifact-id": id }

export const segmentMark = (segmentId: string): SegmentMark => ({ "data-segment-id": segmentId })

const partWithin = (kind: string | undefined, id: string | null, segmentId: string | null): ArtifactPart | null => {
  if (kind === "waypoint" && id !== null) return { kind, waypointId: id }
  if (kind === "context-code-block" && id !== null) return { kind, blockId: id }
  if (segmentId === null) return null
  if (kind === "trace-diagram") return { kind, segmentId }
  if (kind === "trace-node" && id !== null) return { kind, segmentId, nodeId: id }
  if (kind === "blast-node" && id !== null) return { kind, segmentId, path: id }
  return null
}

export const artifactPartOf = (element: Element): ArtifactPart => {
  const marked = element.closest<HTMLElement>(PART_SELECTOR)
  const segmentId = element.closest<HTMLElement>(SEGMENT_SELECTOR)?.dataset.segmentId ?? null
  const part = partWithin(marked?.dataset.artifactPart, marked?.dataset.artifactId ?? null, segmentId)
  if (part !== null) return part
  return segmentId === null ? { kind: "review" } : { kind: "segment", segmentId }
}
