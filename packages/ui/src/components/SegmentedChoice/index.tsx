import { useId } from "react"
import { cn } from "@/lib/utils"

interface SegmentedChoiceProps {
  readonly label: string
  readonly options: readonly { readonly value: string, readonly label: string }[]
  readonly value: string
  readonly className?: string
  readonly onChange: (value: string) => void
}

const SegmentedChoice = ({ label, options, value, className, onChange }: SegmentedChoiceProps) => {
  const groupId = useId()
  return (
    <fieldset className={cn("grid gap-1.5", className)}>
      <legend className="float-left text-sm font-bold">{label}</legend>
      <span className="clear-left inline-flex w-fit overflow-hidden rounded-lg border border-input bg-card">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex h-[calc(2rem-2px)] cursor-pointer items-center border-l border-input px-3 text-sm transition-colors duration-[180ms] ease-out first:border-l-0 hover:bg-muted has-checked:bg-foreground has-checked:font-bold has-checked:text-background has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ring"
          >
            <input
              type="radio"
              name={groupId}
              className="sr-only"
              checked={value === option.value}
              onChange={() => { onChange(option.value) }}
            />
            <span className="text-box-cap">{option.label}</span>
          </label>
        ))}
      </span>
    </fieldset>
  )
}

export default SegmentedChoice
