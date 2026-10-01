import { keyed } from "@flightplan/ui/lib/keyed"
import type { CodeLinkTargets, ProseBlocks } from "@flightplan/ui/lib/review-content"
import Prose from "@flightplan/ui/Prose"

interface ContextBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly context: ProseBlocks
  readonly overviewHeading: string
  readonly whenLabel: string
  readonly thenLabel: string
  readonly scenarios: readonly { readonly when: ProseBlocks, readonly then: ProseBlocks }[]
  readonly implementationHeading: string
  readonly groups: readonly { readonly label: string, readonly items: readonly ProseBlocks[] }[]
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
}

const SUBHEADING_CLASSES = "pb-2 text-sm font-bold text-muted-foreground"
const TERM_CLASSES = "text-sm leading-6 font-bold text-muted-foreground"

const ContextBand = ({
  anchorId,
  heading,
  context,
  overviewHeading,
  whenLabel,
  thenLabel,
  scenarios,
  implementationHeading,
  groups,
  codeLinks,
  onOpenCodeLink,
}: ContextBandProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) pt-6 pb-8">
    <h2 id={`${anchorId}-heading`} className="pb-3 text-lg leading-7 font-bold">{heading}</h2>
    <Prose blocks={context} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} className="text-[1.0625rem] leading-7" />
    {scenarios.length === 0
      ? null
      : (
          <div className="max-w-[44rem] pt-7">
            <h3 className={SUBHEADING_CLASSES}>{overviewHeading}</h3>
            <ul className="flex flex-col">
              {keyed(scenarios).map(({ key, item: scenario }) => (
                <li key={key} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-y-1 border-t py-3">
                  <span className={TERM_CLASSES}>{whenLabel}</span>
                  <Prose blocks={scenario.when} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
                  <span className={TERM_CLASSES}>{thenLabel}</span>
                  <Prose blocks={scenario.then} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
                </li>
              ))}
            </ul>
          </div>
        )}
    {groups.length === 0
      ? null
      : (
          <div className="max-w-[44rem] pt-7">
            <h3 className={SUBHEADING_CLASSES}>{implementationHeading}</h3>
            <dl className="flex flex-col">
              {groups.map((group) => (
                <div key={group.label} className="flex flex-col gap-1.5 border-t py-3">
                  <dt className="font-mono text-[0.8125rem] font-bold">{group.label}</dt>
                  <dd>
                    <ul className="flex list-disc flex-col gap-1 pl-5">
                      {keyed(group.items).map(({ key, item }) => (
                        <li key={key}><Prose blocks={item} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} /></li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
  </section>
)

export default ContextBand
