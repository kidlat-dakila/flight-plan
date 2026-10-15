import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CheckIcon,
  CircleXIcon,
  CopyIcon,
  EraserIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
import Button from "@/components/blocks/button"
import Tooltip, { TooltipContent, TooltipTrigger } from "@/components/blocks/tooltip"

export type IconButtonIcon
  = | "previous"
    | "next"
    | "fold"
    | "unfold"
    | "close"
    | "settings"
    | "edit"
    | "delete"
    | "add"
    | "clear"
    | "remove"
    | "copy"
    | "copied"

interface IconButtonProps {
  readonly icon: IconButtonIcon
  readonly label: string
  readonly isDisabled?: boolean
  readonly variant?: "ghost" | "outline"
  readonly labelPlace?: "tooltip" | "beside"
  readonly className?: string
  readonly onClick: () => void
}

const ICONS: Record<IconButtonIcon, LucideIcon> = {
  previous: ChevronUpIcon,
  next: ChevronDownIcon,
  fold: ChevronDownIcon,
  unfold: ChevronRightIcon,
  close: XIcon,
  settings: SettingsIcon,
  edit: PencilIcon,
  delete: Trash2Icon,
  add: PlusIcon,
  clear: EraserIcon,
  remove: CircleXIcon,
  copy: CopyIcon,
  copied: CheckIcon,
}

const IconButton = ({ icon, label, isDisabled = false, variant = "ghost", labelPlace = "tooltip", className, onClick }: IconButtonProps) => {
  const Icon = ICONS[icon]
  if (labelPlace === "beside") {
    return (
      <Button variant={variant} size="sm" aria-label={label} disabled={isDisabled} className={className} onClick={onClick}>
        <Icon data-icon="inline-start" aria-hidden="true" />
        <span className="text-box-cap">{label}</span>
      </Button>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant={variant} size="icon-sm" aria-label={label} disabled={isDisabled} className={className} onClick={onClick} />}
      >
        <Icon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export default IconButton
