import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import Avatar from "@/components/Avatar"
import Input from "@/components/blocks/input"
import LabelSegments, { type LabelSegment } from "@/components/LabelSegments"
import { PANEL_CLASSES } from "@/components/ReviewActions"
import StopRing, { type StopStatus } from "@/components/StopRing"
import { cn } from "@/lib/utils"

interface SwitchTargetAuthor {
  readonly name: string
  readonly avatarUrl: string | null
  readonly monogram: string
}

export interface SwitchTarget {
  readonly id: string
  readonly title: LabelSegment
  readonly details: readonly LabelSegment[]
  readonly author: SwitchTargetAuthor | null
  readonly branchStatus: StopStatus
  readonly statusLabel: string
}

export interface TargetSwitcherContent {
  readonly heading: string
  readonly searchPlaceholder: string
  readonly emptyLabel: string | null
  readonly currentTargetId: string
  readonly targets: readonly SwitchTarget[]
}

export interface TargetSwitching {
  readonly switcher: TargetSwitcherContent | null
  readonly placeholder: string
  readonly query: string
  readonly onOpen: () => void
  readonly onSearch: (query: string) => void
  readonly onSwitch: (targetId: string) => void
}

interface TargetSwitcherProps {
  readonly title: string
  readonly className: string
  readonly icon?: ReactNode
  readonly switching: TargetSwitching | null
}

const TRIGGER_CLASSES = "flex max-w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-sign-foreground/10 focus-visible:outline-2 focus-visible:outline-sign-foreground data-popup-open:bg-sign-foreground/10"
const OPTION_CLASSES = "flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted aria-[current=page]:bg-muted"

const SwitchTargetOption = ({ target, isCurrent, onSwitch }: {
  readonly target: SwitchTarget
  readonly isCurrent: boolean
  readonly onSwitch: (targetId: string) => void
}) => (
  <li>
    <button type="button" aria-current={isCurrent ? "page" : undefined} className={OPTION_CLASSES} onClick={() => { onSwitch(target.id) }}>
      <StopRing status={target.branchStatus} className="mt-1 size-3.5" />
      <span className="flex min-w-0 flex-1 flex-col">
        <LabelSegments segments={[target.title]} className="font-bold" />
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          {target.author === null
            ? null
            : (
                <>
                  <Avatar imageUrl={target.author.avatarUrl} monogram={target.author.monogram} className="size-4" />
                  <span className="shrink-0">{target.author.name}</span>
                </>
              )}
          <LabelSegments segments={target.details} />
        </span>
      </span>
      <span className="sr-only">{target.statusLabel}</span>
      {isCurrent ? <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : null}
    </button>
  </li>
)

const SwitcherPanel = ({ switching, onSwitch }: {
  readonly switching: TargetSwitching
  readonly onSwitch: (targetId: string) => void
}) => {
  const { switcher } = switching
  if (switcher === null) return <p className="text-muted-foreground">{switching.placeholder}</p>
  return (
    <>
      <PopoverPrimitive.Title className="text-base leading-6 font-bold">{switcher.heading}</PopoverPrimitive.Title>
      <Input
        type="search"
        value={switching.query}
        placeholder={switcher.searchPlaceholder}
        aria-label={switcher.searchPlaceholder}
        onChange={(event) => { switching.onSearch(event.target.value) }}
      />
      {switcher.emptyLabel === null ? null : <p className="text-muted-foreground">{switcher.emptyLabel}</p>}
      <ul aria-label={switcher.heading} className="-mx-2 flex max-h-80 flex-col overflow-y-auto">
        {switcher.targets.map((target) => (
          <SwitchTargetOption
            key={target.id}
            target={target}
            isCurrent={target.id === switcher.currentTargetId}
            onSwitch={onSwitch}
          />
        ))}
      </ul>
    </>
  )
}

const TargetSwitcher = ({ title, className, icon = null, switching }: TargetSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false)
  if (switching === null) {
    return (
      <>
        {icon}
        <h1 className={cn("min-w-0 truncate", className)} title={title}>{title}</h1>
      </>
    )
  }
  const switchTo = (targetId: string): void => {
    setIsOpen(false)
    if (targetId !== switching.switcher?.currentTargetId) switching.onSwitch(targetId)
  }
  return (
    <h1 className={cn("-mx-1.5 flex min-w-0", className)}>
      <PopoverPrimitive.Root
        open={isOpen}
        onOpenChange={(isOpening) => {
          setIsOpen(isOpening)
          if (isOpening) switching.onOpen()
        }}
      >
        <PopoverPrimitive.Trigger className={TRIGGER_CLASSES} title={title}>
          {icon}
          <span className="min-w-0 truncate">{title}</span>
          <ChevronDownIcon aria-hidden="true" className="size-3.5 shrink-0 text-sign-muted" />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner align="start" sideOffset={10} className="isolate z-50">
            <PopoverPrimitive.Popup className={cn(PANEL_CLASSES, "max-w-[calc(100vw-2rem)] font-sans font-normal")}>
              <SwitcherPanel switching={switching} onSwitch={switchTo} />
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </h1>
  )
}

export default TargetSwitcher
