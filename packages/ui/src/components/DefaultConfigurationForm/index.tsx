import { useId, useState, type ReactNode } from "react"

interface PresetOption {
  readonly configurationId: string
  readonly label: string
  readonly bestFor: string
  readonly description: string
  readonly note: string | null
}

interface DefaultConfigurationFormProps {
  readonly presets: readonly PresetOption[]
  readonly selectedConfigurationId: string
  readonly children: ReactNode
  readonly onSubmit: (configurationId: string) => void
}

const DefaultConfigurationForm = ({ presets, selectedConfigurationId, children, onSubmit }: DefaultConfigurationFormProps) => {
  const groupId = useId()
  const [chosenId, setChosenId] = useState(selectedConfigurationId)
  return (
    <form action={() => { onSubmit(chosenId) }}>
      <ul className="border-t border-border">
        {presets.map((option) => (
          <li key={option.configurationId} className="border-b border-border py-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name={groupId}
                checked={chosenId === option.configurationId}
                className="mt-1 size-4 shrink-0 accent-(--primary)"
                onChange={() => { setChosenId(option.configurationId) }}
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
