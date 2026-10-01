import FilterMenu, { FilterMenuOption, FilterMenuReset } from "@flightplan/ui/FilterMenu"
import StopRing, { type StopStatus } from "@flightplan/ui/StopRing"

interface StatusFilterOption {
  readonly status: StopStatus
  readonly label: string
  readonly countLabel: string
  readonly isSelected: boolean
  readonly toggledStatuses: readonly StopStatus[]
}

interface StatusFilterProps {
  readonly buttonLabel: string
  readonly isDefault: boolean
  readonly options: readonly StatusFilterOption[]
  readonly onSelect: (statuses: readonly StopStatus[]) => void
  readonly onReset: () => void
}

const RESET_LABEL = "Reset to the default statuses"

const StatusFilter = ({ buttonLabel, isDefault, options, onSelect, onReset }: StatusFilterProps) => (
  <FilterMenu label={buttonLabel}>
    {options.map((option) => (
      <FilterMenuOption
        key={option.status}
        label={option.label}
        countLabel={option.countLabel}
        isSelected={option.isSelected}
        marker={<StopRing status={option.status} className="size-4 [--line:var(--muted-foreground)]" />}
        onToggle={() => { onSelect(option.toggledStatuses) }}
      />
    ))}
    {isDefault ? null : <FilterMenuReset label={RESET_LABEL} onReset={onReset} />}
  </FilterMenu>
)

export default StatusFilter
