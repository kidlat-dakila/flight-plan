import { useId, useState, type ReactNode } from "react"

type PresetName = "standard" | "minimal" | "onboardee" | "unfamiliar-territory"

interface PresetOption {
  readonly preset: PresetName
  readonly label: string
  readonly bestFor: string
  readonly description: string
  readonly note: string | null
}

interface DefaultConfigurationFormProps {
  readonly presets: readonly PresetOption[]
  readonly selectedPreset: PresetName
  readonly children: ReactNode
  readonly onSubmit: (preset: PresetName) => void
}

const DefaultConfigurationForm = ({ presets, selectedPreset, children, onSubmit }: DefaultConfigurationFormProps) => {
  const groupId = useId()
  const [chosenPreset, setChosenPreset] = useState(selectedPreset)
  return (
    <form action={() => { onSubmit(chosenPreset) }}>
      <ul className="border-t border-border">
        {presets.map((option) => (
          <li key={option.preset} className="border-b border-border py-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name={groupId}
                checked={chosenPreset === option.preset}
                className="mt-1 size-4 shrink-0 accent-(--primary)"
                onChange={() => { setChosenPreset(option.preset) }}
              />
              <span className="min-w-0">
                <span className="block font-bold">{option.label}</span>
                <span className="block max-w-[62ch] text-sm">{option.bestFor}</span>
                <span className="block max-w-[62ch] text-sm text-muted-foreground">{option.description}</span>
                {option.note === null
                  ? null
                  : <span className="block max-w-[62ch] text-sm text-muted-foreground">{option.note}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {children}
    </form>
  )
}

export default DefaultConfigurationForm
