import {
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
  CheckIcon,
  CircleXIcon,
  CopyIcon,
  EraserIcon,
  MaximizeIcon,
  MinimizeIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SettingsIcon,
  Trash2Icon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
  type LucideIcon,
} from "lucide-react"
import Button from "@/components/blocks/button"
import Tooltip, { TooltipContent, TooltipTrigger } from "@/components/blocks/tooltip"

export type IconButtonIcon
  = | "previous"
    | "next"
    | "zoom-in"
    | "zoom-out"
    | "reset-view"
    | "collapse-all"
    | "expand-all"
    | "full-screen"
    | "exit-full-screen"
    | "close"
    | "top"
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
  "previous": ChevronUpIcon,
  "next": ChevronDownIcon,
  "zoom-in": ZoomInIcon,
  "zoom-out": ZoomOutIcon,
  "reset-view": RotateCcwIcon,
  "collapse-all": ChevronsDownUpIcon,
  "expand-all": ChevronsUpDownIcon,
  "full-screen": MaximizeIcon,
  "exit-full-screen": MinimizeIcon,
  "close": XIcon,
  "top": ArrowUpIcon,
  "settings": SettingsIcon,
  "edit": PencilIcon,
  "delete": Trash2Icon,
  "add": PlusIcon,
  "clear": EraserIcon,
  "remove": CircleXIcon,
  "copy": CopyIcon,
  "copied": CheckIcon,
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
