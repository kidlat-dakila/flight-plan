import type { ConversationBand, Rail, SegmentView } from "./schemas"

type RailSection = Rail["sections"][number]

const walkthroughChildren = (segment: SegmentView): RailSection["children"] =>
  segment.walkthrough.files.map((file) => ({ anchorId: file.anchorId, label: file.title }))

type ArrangedSection = SegmentView["sectionOrder"][number]

const railSectionsBySection = (segment: SegmentView): Readonly<Record<ArrangedSection, readonly RailSection[]>> => ({
  context: [{ anchorId: segment.context.anchorId, kind: "context", label: segment.context.heading, children: [] }],
  traceDiagram: [{ anchorId: segment.traceDiagram.anchorId, kind: "traceDiagram", label: segment.traceDiagram.heading, children: [] }],
  blastDiagram: segment.blastDiagram === null
    ? []
    : [{ anchorId: segment.blastDiagram.anchorId, kind: "blastDiagram", label: segment.blastDiagram.heading, children: [] }],
  walkthrough: [{
    anchorId: segment.walkthrough.anchorId,
    kind: "walkthrough",
    label: segment.walkthrough.heading,
    children: walkthroughChildren(segment),
  }],
})

const segmentSections = (segment: SegmentView): RailSection[] => {
  const bySection = railSectionsBySection(segment)
  return segment.sectionOrder.flatMap((section) => bySection[section])
}

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
