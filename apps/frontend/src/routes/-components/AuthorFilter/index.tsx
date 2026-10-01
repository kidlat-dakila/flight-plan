import Avatar from "@flightplan/ui/Avatar"
import FilterMenu, { FilterMenuOption, FilterMenuReset } from "@flightplan/ui/FilterMenu"

interface AuthorFilterOption {
  readonly key: string
  readonly label: string
  readonly person: { readonly avatarUrl: string | null, readonly monogram: string } | null
  readonly countLabel: string
  readonly isSelected: boolean
  readonly toggledAuthors: readonly string[] | null
}

interface AuthorFilterProps {
  readonly buttonLabel: string
  readonly isDefault: boolean
  readonly options: readonly AuthorFilterOption[]
  readonly onSelect: (authors: readonly string[] | null) => void
}

const RESET_LABEL = "Show all authors"

const AuthorFilter = ({ buttonLabel, isDefault, options, onSelect }: AuthorFilterProps) => (
  <FilterMenu label={buttonLabel}>
    {options.map((option) => (
      <FilterMenuOption
        key={option.key}
        label={option.label}
        countLabel={option.countLabel}
        isSelected={option.isSelected}
        marker={option.person === null
          ? <span className="size-5 shrink-0" />
          : <Avatar imageUrl={option.person.avatarUrl} monogram={option.person.monogram} />}
        onToggle={() => { onSelect(option.toggledAuthors) }}
      />
    ))}
    {isDefault ? null : <FilterMenuReset label={RESET_LABEL} onReset={() => { onSelect(null) }} />}
  </FilterMenu>
)

export default AuthorFilter
