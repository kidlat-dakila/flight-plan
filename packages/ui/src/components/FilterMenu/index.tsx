import { ChevronDownIcon } from "lucide-react"
import type { ReactNode } from "react"
import Button from "@/components/blocks/button"
import DropdownMenu, {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/blocks/dropdown-menu"

interface FilterMenuProps {
  readonly label: string
  readonly children: ReactNode
}

interface FilterMenuOptionProps {
  readonly label: string
  readonly countLabel: string
  readonly isSelected: boolean
  readonly marker?: ReactNode
  readonly onToggle: () => void
}

interface FilterMenuResetProps {
  readonly label: string
  readonly onReset: () => void
}

const FilterMenu = ({ label, children }: FilterMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
      <span className="text-box-cap">{label}</span>
      <ChevronDownIcon aria-hidden="true" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">{children}</DropdownMenuContent>
  </DropdownMenu>
)

export const FilterMenuOption = ({ label, countLabel, isSelected, marker, onToggle }: FilterMenuOptionProps) => (
  <DropdownMenuCheckboxItem checked={isSelected} onCheckedChange={onToggle}>
    {marker}
    <span className="flex-1">{label}</span>
    {" "}
    <span className="text-muted-foreground tabular-nums">{countLabel}</span>
  </DropdownMenuCheckboxItem>
)

export const FilterMenuReset = ({ label, onReset }: FilterMenuResetProps) => (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={onReset}>{label}</DropdownMenuItem>
  </>
)

export default FilterMenu
