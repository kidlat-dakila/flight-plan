import { ChevronDownIcon } from "lucide-react"
import { useId } from "react"
import { cn } from "@/lib/utils"

interface SelectFieldProps {
  readonly label: string
  readonly options: readonly { readonly value: string, readonly label: string }[]
  readonly value: string
  readonly className?: string
  readonly onChange: (value: string) => void
}

const SelectField = ({ label, options, value, className, onChange }: SelectFieldProps) => {
  const fieldId = useId()
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-sm font-bold">{label}</label>
      <div className="relative">
        <select
          id={fieldId}
          value={value}
          className="h-8 w-full cursor-pointer appearance-none rounded-lg border border-input bg-card pr-8 pl-2.5 text-sm transition-colors duration-[180ms] ease-out outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          onChange={(event) => { onChange(event.target.value) }}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </div>
  )
}

export default SelectField
