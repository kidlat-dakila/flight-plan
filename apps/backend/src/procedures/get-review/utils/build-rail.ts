import type { ConversationBand, Rail, SegmentView } from "./schemas"

type RailSection = Rail["sections"][number]

const walkthroughChildren = (segment: SegmentView): RailSection["children"] =>
  segment.walkthrough.files.map((file) => ({ anchorId: file.anchorId, label: file.title }))

const segmentSections = (segment: SegmentView): RailSection[] => [
  { anchorId: segment.context.anchorId, kind: "context", label: segment.context.heading, children: [] },
  { anchorId: segment.journey.anchorId, kind: "journey", label: segment.journey.heading, children: [] },
  ...(segment.blast === null
    ? []
    : [{ anchorId: segment.blast.anchorId, kind: "blast" as const, label: segment.blast.heading, children: [] }]),
  {
    anchorId: segment.walkthrough.anchorId,
    kind: "walkthrough",
    label: segment.walkthrough.heading,
    children: walkthroughChildren(segment),
  },
]

const groupLabel = (segment: SegmentView, position: number, total: number): string | null =>
  segment.title === null ? null : `${segment.title} (${String(position)}/${String(total)})`

export const buildRail = (segments: readonly SegmentView[], conversation: ConversationBand | null): Rail => ({
  groups: segments.map((segment, index) => ({
    anchorId: segment.anchorId,
    label: groupLabel(segment, index + 1, segments.length),
    detailLabel: segment.detailLabel,
    sections: segmentSections(segment),
  })),
  sections: conversation === null
    ? []
    : [{ anchorId: conversation.anchorId, kind: "conversation", label: conversation.heading, children: [] }],
})
