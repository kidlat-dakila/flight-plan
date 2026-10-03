import {
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MaximizeIcon,
  MinimizeIcon,
  ScanIcon,
  SettingsIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
  type LucideIcon,
} from "lucide-react"
import Button from "@/components/blocks/button"

export type IconButtonIcon
  = | "previous"
    | "next"
    | "zoom-in"
    | "zoom-out"
    | "fit"
    | "full-screen"
    | "exit-full-screen"
    | "close"
    | "top"
    | "settings"

interface IconButtonProps {
  readonly icon: IconButtonIcon
  readonly label: string
  readonly isDisabled?: boolean
  readonly variant?: "ghost" | "outline"
  readonly className?: string
  readonly onClick: () => void
}

const ICONS: Record<IconButtonIcon, LucideIcon> = {
  "previous": ChevronUpIcon,
  "next": ChevronDownIcon,
  "zoom-in": ZoomInIcon,
  "zoom-out": ZoomOutIcon,
  "fit": ScanIcon,
  "full-screen": MaximizeIcon,
  "exit-full-screen": MinimizeIcon,
  "close": XIcon,
  "top": ArrowUpIcon,
  "settings": SettingsIcon,
}

const IconButton = ({ icon, label, isDisabled = false, variant = "ghost", className, onClick }: IconButtonProps) => {
  const Icon = ICONS[icon]
  return (
    <Button
      variant={variant}
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={isDisabled}
      className={className}
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
    </Button>
  )
}

export default IconButton
