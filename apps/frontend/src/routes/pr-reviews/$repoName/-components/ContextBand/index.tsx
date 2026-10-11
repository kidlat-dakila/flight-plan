import type { CodeLinkTargets, ProseBlocks } from "@flightplan/ui/lib/review-content"
import Prose from "@flightplan/ui/Prose"
import Unwritten from "@flightplan/ui/Unwritten"

interface ContextBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly context: ProseBlocks
  readonly isDraft: boolean
  readonly unwrittenLabel: string
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
}

const ContextBand = ({ anchorId, heading, context, isDraft, unwrittenLabel, codeLinks, onOpenCodeLink }: ContextBandProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) pt-6 pb-8">
    <h2 id={`${anchorId}-heading`} className="pb-4 text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
    {isDraft
      ? (
          <Unwritten isPending lineCount={4} className="max-w-[44rem] text-base">
            <p className="text-muted-foreground">{unwrittenLabel}</p>
          </Unwritten>
        )
      : <Prose blocks={context} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />}
  </section>
)

export default ContextBand
