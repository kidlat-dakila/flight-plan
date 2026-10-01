import IconButton from "@/components/IconButton"

interface WaypointStepperProps {
  readonly positionLabel: string
  readonly previousLabel: string
  readonly nextLabel: string
  readonly canStepBack: boolean
  readonly canStepForward: boolean
  readonly onPrevious: () => void
  readonly onNext: () => void
}

const WaypointStepper = ({
  positionLabel,
  previousLabel,
  nextLabel,
  canStepBack,
  canStepForward,
  onPrevious,
  onNext,
}: WaypointStepperProps) => (
  <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-input bg-card p-0.5">
    <IconButton icon="previous" label={previousLabel} isDisabled={!canStepBack} className="size-6" onClick={onPrevious} />
    <span aria-live="polite" className="min-w-24 px-1.5 text-center text-[0.8rem] whitespace-nowrap tabular-nums">{positionLabel}</span>
    <IconButton icon="next" label={nextLabel} isDisabled={!canStepForward} className="size-6" onClick={onNext} />
  </div>
)

export default WaypointStepper
