import { useId } from "react"

export interface DiagramConfiguration {
  readonly label: string
  readonly levels: {
    readonly label: string
    readonly options: readonly { readonly label: string, readonly value: number | null, readonly isSelected: boolean }[]
  } | null
  readonly toggles: readonly {
    readonly key: "data" | "assumed"
    readonly label: string
    readonly countLabel: string
    readonly isOn: boolean
  }[]
}

interface DiagramConfigurationBarProps {
  readonly configuration: DiagramConfiguration
  readonly onLevelsChange: (levels: number | null) => void
  readonly onToggle: (key: "data" | "assumed", isOn: boolean) => void
}

const DiagramConfigurationBar = ({ configuration, onLevelsChange, onToggle }: DiagramConfigurationBarProps) => {
  const groupId = useId()
  return (
    <fieldset aria-label={configuration.label} className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm empty:hidden">
      {configuration.levels === null
        ? null
        : (
            <div role="radiogroup" aria-label={configuration.levels.label} className="flex items-center gap-2">
              <span className="text-muted-foreground">{configuration.levels.label}</span>
              <span className="inline-flex overflow-hidden rounded-md border border-input bg-card">
                {configuration.levels.options.map((option) => (
                  <label
                    key={option.label}
                    className="flex h-7 min-w-8 cursor-pointer items-center justify-center border-l border-input px-2.5 text-[0.8rem] first:border-l-0 hover:bg-muted has-checked:bg-foreground has-checked:font-bold has-checked:text-background has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ring"
                  >
                    <input
                      type="radio"
                      name={groupId}
                      className="sr-only"
                      checked={option.isSelected}
                      onChange={() => {
                        onLevelsChange(option.value)
                      }}
                    />
                    <span className="text-box-cap">{option.label}</span>
                  </label>
                ))}
              </span>
            </div>
          )}
      {configuration.toggles.map((toggle) => (
        <label key={toggle.key} className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={toggle.isOn}
            className="size-3.5 accent-(--primary)"
            onChange={(event) => {
              onToggle(toggle.key, event.target.checked)
            }}
          />
          <span>{toggle.label}</span>
          <span className="text-muted-foreground tabular-nums">{toggle.countLabel}</span>
        </label>
      ))}
    </fieldset>
  )
}

export default DiagramConfigurationBar
