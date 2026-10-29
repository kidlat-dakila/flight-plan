import SegmentHeading from "@flightplan/ui/SegmentHeading"
import TraceBand from "@flightplan/ui/TraceBand"
import type { PlaygroundCasePage, PlaygroundPage } from "./playground-schemas"
import { useIsPainted } from "./use-is-painted"

interface PlaygroundCaseProps {
  readonly playgroundPage: PlaygroundPage
}

interface CaseBandsProps {
  readonly playgroundCase: PlaygroundCasePage
}

const NO_DETAIL_LABEL = null

const ignoreCodeLink = (): void => undefined

const CaseBands = ({ playgroundCase: { page } }: CaseBandsProps) => (
  <>
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
  </>
)

const VariantCase = ({ playgroundCase }: CaseBandsProps) => (
  <section aria-label={playgroundCase.title} data-testid="playground-variant" data-variant-id={playgroundCase.id} className="pt-8">
    <header className="pb-2">
      <h2 className="text-xl leading-7 font-semibold text-foreground">{playgroundCase.title}</h2>
      <p className="text-muted-foreground">{playgroundCase.caseTitle}</p>
    </header>
    <CaseBands playgroundCase={playgroundCase} />
  </section>
)

const PlaygroundCase = ({ playgroundPage: { entry, cases } }: PlaygroundCaseProps) => {
  const isPainted = useIsPainted()
  const ownCase = cases.find((playgroundCase) => playgroundCase.id === entry.id) ?? null
  return (
    <article aria-label={entry.title} data-testid="playground-case">
      <header className="pb-2">
        <h1 className="text-2xl leading-8 font-semibold text-foreground">{entry.title}</h1>
        {ownCase === null ? null : <p className="text-muted-foreground">{ownCase.caseTitle}</p>}
      </header>
      {ownCase === null
        ? cases.map((playgroundCase) => <VariantCase key={playgroundCase.id} playgroundCase={playgroundCase} />)
        : <CaseBands playgroundCase={ownCase} />}
      {isPainted ? <span hidden data-testid="playground-ready" data-playground-id={entry.id} /> : null}
    </article>
  )
}

export default PlaygroundCase
