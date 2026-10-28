import TraceBand from "@flightplan/ui/TraceBand"
import type { TraceFixturePage, TracePageSegment } from "./trace-fixture-schemas"
import { useIsPainted } from "./use-is-painted"

interface LabBandProps {
  readonly fixtureId: string
  readonly diagramId: string
  readonly page: TraceFixturePage["page"]
  readonly segment: TracePageSegment
  readonly tabId: string | null
}

const ignoreCodeLink = (): void => undefined

const LabBand = ({ fixtureId, diagramId, page, segment, tabId }: LabBandProps) => {
  const isPainted = useIsPainted()
  return (
    <>
      <TraceBand
        {...segment.traceDiagram}
        codeLinks={page.codeLinks}
        codeDefinitions={page.codeDefinitions}
        isReviewPending={false}
        isFullScreenAtStart
        openTabIdAtStart={tabId}
        onOpenCodeLink={ignoreCodeLink}
        onWaypointReviewedChange={null}
      />
      {isPainted ? <span hidden data-testid="band-ready" data-fixture-id={fixtureId} data-diagram-id={diagramId} data-segment-id={segment.id} data-tab-id={tabId ?? undefined} /> : null}
    </>
  )
}

export default LabBand
