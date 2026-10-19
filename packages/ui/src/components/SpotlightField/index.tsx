import { useId } from "react"
import Tooltip, { TooltipContent, TooltipTrigger } from "@/components/blocks/tooltip"

export interface SpotlightChoice<Classification extends string> {
  readonly classification: Classification
  readonly label: string
  readonly description: string
}

interface SpotlightFieldProps<Classification extends string> {
  readonly labelledBy: string
  readonly choices: readonly SpotlightChoice<Classification>[]
  readonly picked: readonly Classification[]
  readonly onChange: (picked: Classification[]) => void
}

const EMPTY_HINT = "Nothing is in the spotlight. A review then marks no change, and \"Important changes first\" sorts by core changes alone."

const TOGGLE_CLASSES = "flex h-8 cursor-pointer items-center rounded-lg border border-input bg-card px-3 text-sm transition-colors duration-[180ms] ease-out hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"

const toggledIn = <Classification extends string>(
  choices: readonly SpotlightChoice<Classification>[],
  picked: readonly Classification[],
  classification: Classification,
): Classification[] => {
  const isPicked = picked.includes(classification)
  return choices
    .map((choice) => choice.classification)
    .filter((candidate) => candidate === classification ? !isPicked : picked.includes(candidate))
}

interface SpotlightToggleProps {
  readonly choice: SpotlightChoice<string>
  readonly isPicked: boolean
  readonly onToggle: () => void
}

const SpotlightToggle = ({ choice, isPicked, onToggle }: SpotlightToggleProps) => {
  const descriptionId = useId()
  return (
    <li>
      <Tooltip>
        <TooltipTrigger
          render={(
            <button
              type="button"
              aria-pressed={isPicked}
              aria-describedby={descriptionId}
              className={TOGGLE_CLASSES}
              onClick={onToggle}
            />
          )}
        >
          <span className="text-box-cap">{choice.label}</span>
        </TooltipTrigger>
        <TooltipContent>{choice.description}</TooltipContent>
      </Tooltip>
      <span id={descriptionId} className="sr-only">{choice.description}</span>
    </li>
  )
}

const SpotlightField = <Classification extends string>({
  labelledBy,
  choices,
  picked,
  onChange,
}: SpotlightFieldProps<Classification>) => (
  <div role="group" aria-labelledby={labelledBy}>
    <ul className="flex flex-wrap gap-2">
      {choices.map((choice) => (
        <SpotlightToggle
          key={choice.classification}
          choice={choice}
          isPicked={picked.includes(choice.classification)}
          onToggle={() => { onChange(toggledIn(choices, picked, choice.classification)) }}
        />
      ))}
    </ul>
    {picked.length === 0 ? <p className="mt-3 max-w-[62ch] text-sm text-muted-foreground">{EMPTY_HINT}</p> : null}
  </div>
)

export default SpotlightField
