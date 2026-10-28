import SegmentHeading from "@flightplan/ui/SegmentHeading"
import TraceBand from "@flightplan/ui/TraceBand"
import type { PlaygroundPage } from "./playground-schemas"
import { useIsPainted } from "./use-is-painted"

interface PlaygroundCaseProps {
  readonly playgroundPage: PlaygroundPage
}

const NO_DETAIL_LABEL = null

const ignoreCodeLink = (): void => undefined

const PlaygroundCase = ({ playgroundPage: { entry, page } }: PlaygroundCaseProps) => {
  const isPainted = useIsPainted()
  return (
    <article aria-label={entry.title} data-testid="playground-case">
      <header className="pb-2">
        <h1 className="text-2xl leading-8 font-semibold text-foreground">{entry.title}</h1>
        <p className="text-muted-foreground">{entry.caseTitle}</p>
      </header>
      {page.segments.map((segment) => (
        <section key={segment.id} aria-label={segment.heading ?? segment.traceDiagram.heading}>
          {segment.heading === null ? null : <SegmentHeading heading={segment.heading} detailLabel={NO_DETAIL_LABEL} />}
          <TraceBand
            {...segment.traceDiagram}
            codeLinks={page.codeLinks}
            codeDefinitions={page.codeDefinitions}
            isReviewPending={false}
            isFullScreenAtStart={false}
            onOpenCodeLink={ignoreCodeLink}
            onWaypointReviewedChange={null}
          />
        </section>
      ))}
      {isPainted ? <span hidden data-testid="playground-ready" data-playground-id={entry.id} /> : null}
    </article>
  )
}

export default PlaygroundCase
