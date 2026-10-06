import type { CodeLinkTargets, ProseBlocks } from "@flightplan/ui/lib/review-content"
import Prose from "@flightplan/ui/Prose"

interface ContextBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly context: ProseBlocks
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
}

const ContextBand = ({ anchorId, heading, context, codeLinks, onOpenCodeLink }: ContextBandProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) pt-6 pb-8">
    <h2 id={`${anchorId}-heading`} className="pb-4 text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
    <Prose blocks={context} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  </section>
)

export default ContextBand
