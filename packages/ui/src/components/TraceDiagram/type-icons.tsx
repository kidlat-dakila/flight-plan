import {
  ActivityIcon,
  AnchorIcon,
  ArrowRightLeftIcon,
  ArrowUpRightIcon,
  BoxIcon,
  BracesIcon,
  CloudDownloadIcon,
  CodeXmlIcon,
  ComponentIcon,
  CookieIcon,
  CornerDownLeftIcon,
  DatabaseIcon,
  EarIcon,
  EyeIcon,
  FileIcon,
  FlagIcon,
  FootprintsIcon,
  FunnelIcon,
  ImportIcon,
  KeyRoundIcon,
  LayoutTemplateIcon,
  LifeBuoyIcon,
  LinkIcon,
  LogInIcon,
  MemoryStickIcon,
  MousePointerClickIcon,
  NavigationIcon,
  OctagonXIcon,
  PiIcon,
  PuzzleIcon,
  QuoteIcon,
  RadioTowerIcon,
  RepeatIcon,
  RouteIcon,
  Rows3Icon,
  SendIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SigmaIcon,
  SlidersHorizontalIcon,
  SplitIcon,
  SquareFunctionIcon,
  SquareMinusIcon,
  TagIcon,
  TerminalIcon,
  ToggleRightIcon,
  TriangleAlertIcon,
  TypeIcon as TypeDeclarationIcon,
  VariableIcon,
  WorkflowIcon,
  ZapIcon,
} from "lucide-react"
import { createElement, type ComponentType, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface BlockIconProps {
  readonly "className"?: string
  readonly "aria-hidden"?: boolean | "true" | "false"
}

type BlockIcon = ComponentType<BlockIconProps>

interface IconFrameProps extends BlockIconProps {
  readonly children: ReactNode
}

const ICON_SIZE = 24
const ICON_VIEW_BOX = "0 0 24 24"
const ICON_STROKE_WIDTH = 2

const IconFrame = ({ className, "aria-hidden": ariaHidden, children }: IconFrameProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={ICON_SIZE}
    height={ICON_SIZE}
    viewBox={ICON_VIEW_BOX}
    fill="none"
    stroke="currentColor"
    strokeWidth={ICON_STROKE_WIDTH}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={ariaHidden}
    className={cn("lucide", className)}
  >
    {children}
  </svg>
)

const MethodIcon = (props: BlockIconProps) => (
  <IconFrame {...props}>
    <circle cx="5" cy="18" r="1" />
    <path d="M10 20c2.5 0 3.5-1.5 3.5-4V8c0-2.5 1.2-4 4-4" />
    <path d="M10 11h7" />
  </IconFrame>
)

const SwitchIcon = (props: BlockIconProps) => (
  <IconFrame {...props}>
    <path d="M12 21v-7" />
    <path d="m12 14-6-7" />
    <path d="M12 14V7" />
    <path d="m12 14 6-7" />
    <circle cx="6" cy="5" r="2" />
    <circle cx="12" cy="5" r="2" />
    <circle cx="18" cy="5" r="2" />
  </IconFrame>
)

const SwitchCaseIcon = (props: BlockIconProps) => (
  <IconFrame {...props}>
    <path d="M7 21v-7" />
    <path d="m7 14 9-7" />
    <circle cx="18" cy="5" r="2" />
  </IconFrame>
)

const ComponentEffectIcon = (props: BlockIconProps) => (
  <IconFrame {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M13 7 8 13h4l-1 4 5-6h-4z" />
  </IconFrame>
)

const ResolverIcon = (props: BlockIconProps) => (
  <IconFrame {...props}>
    <path d="M12 2.5 20.5 7.25v9.5L12 21.5l-8.5-4.75v-9.5z" />
    <path d="M12 2.5 20.5 16.75h-17z" />
  </IconFrame>
)

const TYPE_ICONS: Readonly<Record<string, BlockIcon>> = {
  "function": SquareFunctionIcon,
  "method": MethodIcon,
  "hook": AnchorIcon,
  "component": ComponentIcon,
  "class": BoxIcon,
  "root-variable": PiIcon,
  "root-statement": TerminalIcon,
  "type-declaration": TypeDeclarationIcon,
  "import": ImportIcon,
  "directive": QuoteIcon,
  "file": FileIcon,
  "condition": SplitIcon,
  "switch": SwitchIcon,
  "switch-case": SwitchCaseIcon,
  "loop": RepeatIcon,
  "try-catch": LifeBuoyIcon,
  "throw": TriangleAlertIcon,
  "call": ArrowUpRightIcon,
  "effect": ZapIcon,
  "component-effect": ComponentEffectIcon,
  "effect-callback": CornerDownLeftIcon,
  "code-event": EarIcon,
  "route": RouteIcon,
  "resolver": ResolverIcon,
  "middleware": FunnelIcon,
  "render": CodeXmlIcon,
  "render-condition": EyeIcon,
  "render-loop": Rows3Icon,
  "render-event": MousePointerClickIcon,
  "render-root": LayoutTemplateIcon,
  "state": ToggleRightIcon,
  "derived": SigmaIcon,
  "data": DatabaseIcon,
  "data-fetch": CloudDownloadIcon,
  "cache": MemoryStickIcon,
  "auth": KeyRoundIcon,
  "request": SendIcon,
  "navigation": NavigationIcon,
  "publish": RadioTowerIcon,
  "validation": ShieldCheckIcon,
  "config": SettingsIcon,
  "feature-flag": FlagIcon,
  "storage": CookieIcon,
  "telemetry": ActivityIcon,
  "transaction": ArrowRightLeftIcon,
  "external-value": LogInIcon,
  "root-argument-value": SlidersHorizontalIcon,
  "variable": VariableIcon,
  "property": TagIcon,
  "deleted": SquareMinusIcon,
}

const BLOCK_LIST_ICONS: Readonly<Record<string, BlockIcon>> = {
  "argument": SlidersHorizontalIcon,
  "property": TagIcon,
  "state": ToggleRightIcon,
  "hook": AnchorIcon,
  "effect": ZapIcon,
  "memo": SigmaIcon,
  "dependency": LinkIcon,
  "outside-variable": EyeIcon,
  "call": ArrowUpRightIcon,
  "return": CornerDownLeftIcon,
  "throw": OctagonXIcon,
  "step": FootprintsIcon,
  "part": PuzzleIcon,
  "render": CodeXmlIcon,
}

const RENDER_ROW_ICONS: Readonly<Record<string, BlockIcon>> = {
  condition: SplitIcon,
  loop: RepeatIcon,
  component: ComponentIcon,
  value: BracesIcon,
}

const UNKNOWN_ICON: BlockIcon = WorkflowIcon

const iconIn = (icons: Readonly<Record<string, BlockIcon>>, key: string): BlockIcon =>
  Object.hasOwn(icons, key) ? icons[key] : UNKNOWN_ICON

export const typeIconOf = (type: string): BlockIcon => iconIn(TYPE_ICONS, type)

const blockListIconOf = (kind: string): BlockIcon => iconIn(BLOCK_LIST_ICONS, kind)

const renderRowIconOf = (kind: string): BlockIcon => iconIn(RENDER_ROW_ICONS, kind)

interface BlockTypeIconProps {
  readonly type: string
  readonly className?: string
}

interface BlockListIconProps {
  readonly kind: string
  readonly className?: string
}

const BlockTypeIcon = ({ type, className }: BlockTypeIconProps) => createElement(typeIconOf(type), { "aria-hidden": "true", className })

export const BlockListIcon = ({ kind, className }: BlockListIconProps) => createElement(blockListIconOf(kind), { "aria-hidden": "true", className })

export const RenderRowIcon = ({ kind, className }: BlockListIconProps) => createElement(renderRowIconOf(kind), { "aria-hidden": "true", className })

export default BlockTypeIcon
