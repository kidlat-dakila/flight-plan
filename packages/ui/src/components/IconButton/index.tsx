import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CheckIcon,
  CircleXIcon,
  CopyIcon,
  Maximize2Icon,
  Minimize2Icon,
  PencilIcon,
  PlusIcon,
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
    | "fold"
    | "unfold"
    | "close"
    | "settings"
    | "edit"
    | "delete"
    | "add"
    | "remove"
    | "copy"
    | "copied"
    | "zoomIn"
    | "zoomOut"
    | "fullScreen"
    | "leaveFullScreen"

interface IconButtonProps {
  readonly icon: IconButtonIcon
  readonly label: string
  readonly isDisabled?: boolean
  readonly variant?: "ghost" | "outline"
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
  remove: CircleXIcon,
  copy: CopyIcon,
  copied: CheckIcon,
  zoomIn: ZoomInIcon,
  zoomOut: ZoomOutIcon,
  fullScreen: Maximize2Icon,
  leaveFullScreen: Minimize2Icon,
}

const IconButton = ({ icon, label, isDisabled = false, variant = "ghost", className, onClick }: IconButtonProps) => {
  const Icon = ICONS[icon]
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
