import { useId } from "react"

interface CheckboxChipProps {
  readonly label: string
  readonly description: string | null
  readonly isChecked: boolean
  readonly onToggle: () => void
}

const CHIP_CLASSES = "flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-card pr-3.5 pl-3 text-sm transition-colors duration-[180ms] ease-out select-none hover:bg-muted has-checked:border-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
const CHECKBOX_CLASSES = "size-4 shrink-0 cursor-pointer accent-(--primary) focus-visible:outline-none"

const CheckboxChip = ({ label, description, isChecked, onToggle }: CheckboxChipProps) => {
  const descriptionId = useId()
  return (
    <>
      <label className={CHIP_CLASSES}>
        <input
          type="checkbox"
          checked={isChecked}
          aria-describedby={description === null ? undefined : descriptionId}
          className={CHECKBOX_CLASSES}
          onChange={onToggle}
        />
        <span className="text-box-cap">{label}</span>
      </label>
      {description === null ? null : <span id={descriptionId} className="sr-only">{description}</span>}
    </>
  )
}

export default CheckboxChip
