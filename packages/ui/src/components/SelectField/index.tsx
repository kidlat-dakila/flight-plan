import { ChevronDownIcon } from "lucide-react"
import { useId } from "react"
import ProblemAlert from "@/components/ProblemAlert"
import { cn } from "@/lib/utils"

interface SelectFieldProps {
  readonly label: string
  readonly options: readonly { readonly value: string, readonly label: string }[]
  readonly value: string
  readonly className?: string
  readonly errorMessage?: string | null
  readonly onTroubleshoot?: (() => void) | null
  readonly isLabelHidden?: boolean
  readonly onChange: (value: string) => void
}

const SelectField = ({
  label,
  options,
  value,
  className,
  errorMessage = null,
  onTroubleshoot = null,
  isLabelHidden = false,
  onChange,
}: SelectFieldProps) => {
  const fieldId = useId()
  const errorId = useId()
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={fieldId} className={isLabelHidden ? "sr-only" : "text-sm font-bold"}>{label}</label>
      <div className="relative">
        <select
          id={fieldId}
          value={value}
          aria-invalid={errorMessage !== null}
          aria-describedby={errorMessage === null ? undefined : errorId}
          className="h-8 w-full cursor-pointer appearance-none rounded-lg border border-input bg-card pr-8 pl-2.5 text-sm transition-colors duration-[180ms] ease-out outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
          onChange={(event) => { onChange(event.target.value) }}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
      {errorMessage === null ? null : <ProblemAlert message={errorMessage} onTroubleshoot={onTroubleshoot} messageId={errorId} className="text-sm text-destructive" />}
    </div>
  )
}

export default SelectField
