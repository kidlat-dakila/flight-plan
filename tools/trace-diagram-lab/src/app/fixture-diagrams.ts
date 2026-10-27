interface DiagramTab {
  readonly id: string
  readonly label: string
}

interface DiagramSegment {
  readonly id: string
  readonly heading: string | null
  readonly traceDiagram: { readonly tabs: readonly DiagramTab[] }
}

interface DiagramPage {
  readonly segments: readonly DiagramSegment[]
}

export interface FixtureDiagram {
  readonly id: string
  readonly segmentId: string
  readonly tabId: string | null
  readonly label: string
}

const ID_SEPARATOR = "/"
const LABEL_SEPARATOR = " / "

const diagramIdOf = (segmentId: string, tabId: string | null): string => (tabId === null ? segmentId : [segmentId, tabId].join(ID_SEPARATOR))

const diagramLabelOf = (segment: DiagramSegment, tab: DiagramTab | null): string => {
  const parts = [segment.heading, tab?.label ?? null].filter((part): part is string => part !== null)
  return parts.length === 0 ? segment.id : parts.join(LABEL_SEPARATOR)
}

const diagramOf = (segment: DiagramSegment, tab: DiagramTab | null): FixtureDiagram => ({
  id: diagramIdOf(segment.id, tab?.id ?? null),
  segmentId: segment.id,
  tabId: tab?.id ?? null,
  label: diagramLabelOf(segment, tab),
})

const segmentDiagramsOf = (segment: DiagramSegment): FixtureDiagram[] =>
  segment.traceDiagram.tabs.length === 0 ? [diagramOf(segment, null)] : segment.traceDiagram.tabs.map((tab) => diagramOf(segment, tab))

export const listFixtureDiagrams = (page: DiagramPage): FixtureDiagram[] => page.segments.flatMap(segmentDiagramsOf)

export const chosenDiagramOf = (diagrams: readonly FixtureDiagram[], segmentId: string | null, tabId: string | null): FixtureDiagram | null =>
  diagrams.find((diagram) => diagram.segmentId === segmentId && diagram.tabId === tabId)
  ?? diagrams.find((diagram) => diagram.segmentId === segmentId)
  ?? diagrams.at(0)
  ?? null
