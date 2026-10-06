import { useState } from "react"
import Button from "@/components/blocks/button"
import CodeBlock from "@/components/CodeBlock"
import { FindingChip } from "@/components/FindingMark"
import Prose, { Inlines } from "@/components/Prose"
import { keyed } from "@/lib/keyed"
import type { CodeLinkTargets, Finding } from "@/lib/review-content"

interface FindingCardProps {
  readonly finding: Finding
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
}

const FindingCard = ({ finding, codeLinks, onOpenCodeLink }: FindingCardProps) => {
  const [isSolutionShown, setIsSolutionShown] = useState(false)
  const { solution, trace } = finding
  return (
    <article className="flex flex-col gap-2 border-t pt-3 text-base leading-[1.7]">
      <h4 className="flex items-baseline gap-2">
        <FindingChip kind={finding.kind} label={finding.kindLabel} className="translate-y-px" />
        <span className="font-semibold">
          <Inlines inlines={finding.title} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
        </span>
      </h4>
      <Prose blocks={finding.reading} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
      {trace === null
        ? null
        : (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-muted-foreground">{finding.traceLabel}</p>
              <ol className="flex max-w-[66ch] list-decimal flex-col gap-1.5 pl-5 text-base leading-[1.7]">
                {keyed(trace).map(({ key, item }) => (
                  <li key={key}><Inlines inlines={item} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} /></li>
                ))}
              </ol>
            </div>
          )}
      {solution === null
        ? null
        : (
            <div className="flex flex-col items-start gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-expanded={isSolutionShown}
                onClick={() => { setIsSolutionShown((isShown) => !isShown) }}
              >
                {isSolutionShown ? solution.hideLabel : solution.showLabel}
              </Button>
              {isSolutionShown
                ? <CodeBlock lines={solution.lines} label={solution.showLabel} className="w-full rounded-md border" />
                : null}
            </div>
          )}
    </article>
  )
}

export default FindingCard
