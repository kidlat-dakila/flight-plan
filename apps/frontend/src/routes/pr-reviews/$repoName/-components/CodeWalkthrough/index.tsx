import type { ReactNode } from "react"
import Button from "@flightplan/ui/blocks/button"
import FilterMenu, { FilterMenuOption, FilterMenuReset } from "@flightplan/ui/FilterMenu"
import FindingMark, { type FindingMarkKind } from "@flightplan/ui/FindingMark"
import type { CodeLinkTargets, ProseBlocks } from "@flightplan/ui/lib/review-content"
import Prose from "@flightplan/ui/Prose"
import WaypointStepper from "@flightplan/ui/WaypointStepper"

interface WaypointFilter {
  readonly buttonLabel: string
  readonly isDefault: boolean
  readonly resetLabel: string
  readonly options: readonly {
    readonly key: FindingMarkKind
    readonly label: string
    readonly countLabel: string
    readonly isSelected: boolean
    readonly toggledKeys: readonly FindingMarkKind[]
  }[]
}

interface CodeWalkthroughProps {
  readonly anchorId: string
  readonly heading: string
  readonly intro: ProseBlocks | null
  readonly coverageLabel: string
  readonly controls: {
    readonly filter: WaypointFilter
    readonly reviewedToggle: { readonly label: string, readonly isShown: boolean, readonly isAvailable: boolean }
    readonly stepping: { readonly previousLabel: string, readonly nextLabel: string }
  }
  readonly positionLabel: string
  readonly canStepBack: boolean
  readonly canStepForward: boolean
  readonly emptyMessage: string | null
  readonly codeLinks: CodeLinkTargets
  readonly children: ReactNode
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onPrevious: () => void
  readonly onNext: () => void
  readonly onFilterChange: (keys: readonly FindingMarkKind[] | null) => void
  readonly onShowReviewedChange: (isShown: boolean) => void
}

const CodeWalkthrough = ({
  anchorId,
  heading,
  intro,
  coverageLabel,
  controls: { filter, reviewedToggle, stepping: stepLabels },
  positionLabel,
  canStepBack,
  canStepForward,
  emptyMessage,
  codeLinks,
  children,
  onOpenCodeLink,
  onPrevious,
  onNext,
  onFilterChange,
  onShowReviewedChange,
}: CodeWalkthroughProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) border-t pb-10">
    <div className="sticky top-(--band-height) z-20 flex h-(--walkthrough-heading-height) items-center gap-3 border-b bg-background">
      <h2 id={`${anchorId}-heading`} className="shrink-0 text-xl leading-7 font-bold whitespace-nowrap text-(--line)">{heading}</h2>
      <p className="min-w-0 truncate text-sm text-muted-foreground tabular-nums">{coverageLabel}</p>
      <span className="flex-1" />
      <WaypointStepper
        positionLabel={positionLabel}
        previousLabel={stepLabels.previousLabel}
        nextLabel={stepLabels.nextLabel}
        canStepBack={canStepBack}
        canStepForward={canStepForward}
        onPrevious={onPrevious}
        onNext={onNext}
      />
      <Button
        variant="outline"
        size="sm"
        aria-pressed={reviewedToggle.isShown}
        disabled={!reviewedToggle.isAvailable && !reviewedToggle.isShown}
        className="aria-pressed:bg-foreground aria-pressed:font-bold aria-pressed:text-background"
        onClick={() => { onShowReviewedChange(!reviewedToggle.isShown) }}
      >
        {reviewedToggle.label}
      </Button>
      <FilterMenu label={filter.buttonLabel}>
        {filter.options.map((option) => (
          <FilterMenuOption
            key={option.key}
            label={option.label}
            countLabel={option.countLabel}
            isSelected={option.isSelected}
            marker={<FindingMark kind={option.key} />}
            onToggle={() => { onFilterChange(option.toggledKeys) }}
          />
        ))}
        {filter.isDefault ? null : <FilterMenuReset label={filter.resetLabel} onReset={() => { onFilterChange(null) }} />}
      </FilterMenu>
    </div>
    {intro === null ? null : <Prose blocks={intro} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} className="pt-4" />}
    {emptyMessage === null ? null : <p className="pt-6 text-muted-foreground">{emptyMessage}</p>}
    {children}
  </section>
)

export default CodeWalkthrough
