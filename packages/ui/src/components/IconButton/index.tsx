import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CheckIcon,
  CircleXIcon,
  CopyIcon,
  Maximize2Icon,
  Minimize2Icon,
  PanelLeftCloseIcon,
  PanelRightCloseIcon,
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
    | "hideLeftPanel"
    | "hideRightPanel"

interface IconButtonProps {
  readonly icon: IconButtonIcon
  readonly label: string
  readonly isDisabled?: boolean
  readonly variant?: "ghost" | "outline"
  readonly className?: string
  readonly actionId?: string
  readonly shortcutLabel?: string | null
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
  hideLeftPanel: PanelLeftCloseIcon,
  hideRightPanel: PanelRightCloseIcon,
}

const UPPER_CASE_LETTER = /[A-Z]/g

const defaultActionIdOf = (icon: IconButtonIcon): string =>
  `${icon.replace(UPPER_CASE_LETTER, (letter) => `-${letter.toLowerCase()}`)}-icon-action`

export const TooltipKeycap = ({ label }: { readonly label: string }) => (
  <kbd data-slot="kbd" className="rounded-sm bg-background/15 px-1 font-mono text-[0.6875rem] leading-4">{label}</kbd>
)

const IconButton = ({ icon, label, isDisabled = false, variant = "ghost", className, actionId, shortcutLabel = null, onClick }: IconButtonProps) => {
  const Icon = ICONS[icon]
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant={variant} size="icon-sm" aria-label={label} disabled={isDisabled} data-user-action-id={actionId ?? defaultActionIdOf(icon)} className={className} onClick={onClick} />}
      >
        <Icon aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcutLabel === null ? null : <TooltipKeycap label={shortcutLabel} />}
      </TooltipContent>
    </Tooltip>
  )
}

export default IconButton
