import { ChevronUpIcon } from "lucide-react"
import { use, useCallback, useEffect, useEffectEvent, useId, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react"
import Menubar, {
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/blocks/menubar"
import Tooltip, { TooltipContent, TooltipTrigger } from "@/components/blocks/tooltip"
import { recordKeyedAction } from "@/lib/guide-tooltips/hooks"
import { useGuideViewTracking } from "@/lib/guide-tooltips/view-tracking"
import {
  NavigatorContext,
  NavigatorSectionsContext,
  type FullScreenOwner,
  type GroupsReader,
  type NavigatorSections,
  type NavigatorState,
} from "@/lib/navigator"
import {
  controlOfKey,
  dominantAnchorIdOf,
  jumpMenuOf,
  navigatorSignatureOf,
  railAnchorIdsOf,
  sectionStepsOf,
  withSectionSteps,
  type ChangeTone,
  type JumpSection,
  type NavigatorBadge,
  type NavigatorButton,
  type NavigatorChoice,
  type NavigatorControl,
  type NavigatorGroup,
  type NavigatorMenu,
  type NavigatorRail,
  type NavigatorSubmenu,
  type SectionSpan,
} from "@/lib/navigator-controls"
import { isNavigatorKeyEvent, navigatorKeyOf } from "@/lib/navigator-keys"
import { coveredTopOf } from "@/lib/pinned-rows"
import { cn } from "@/lib/utils"

interface ReviewNavigatorProps {
  readonly rail: NavigatorRail
  readonly onSectionJump?: (anchorId: string) => void
  readonly children: ReactNode
}

interface ReviewNavigatorBarProps {
  readonly place?: "page" | "full-screen"
}

type KeyHint = readonly [keys: readonly string[], label: string]

type ReadersByAnchorId = ReadonlyMap<string, GroupsReader>

const JUMP_KEY = "w"
const JUMP_LABEL = "Jump to"
const JUMP_ACTION_ID = "jump-to-action"
const NAVIGATOR_LABEL = "Review navigator"
const HERE_LABEL = "Here"
const OTHER_SEGMENTS_LABEL = "Other segments"
const FLASH_MS = 180
const HINT_MS = 3000
const NO_FRAME = 0
const ANCHOR_SEPARATOR = "\n"
const JUMP_HINTS: readonly KeyHint[] = [[["↑", "↓"], "move"], [["→"], "sections"], [["↵"], "jump"], [["esc"], "close"]]
const MENU_HINTS: readonly KeyHint[] = [[["↑", "↓"], "move"], [["space"], "tick"], [["esc"], "close"]]
const SUBMENU_HINTS: readonly KeyHint[] = [[["↑", "↓"], "move"], [["→"], "open"], [["space"], "tick"], [["esc"], "close"]]
const NO_READERS: ReadersByAnchorId = new Map()
const NO_GROUPS: readonly NavigatorGroup[] = []

const BUTTON_CLASSES = "inline-flex h-[1.875rem] shrink-0 cursor-pointer items-center gap-1.5 rounded-[0.3rem] px-[0.4375rem] outline-none transition-colors duration-[180ms] ease-out hover:bg-sign-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 aria-pressed:bg-sign-foreground aria-pressed:font-bold aria-pressed:text-sign data-[flash=true]:bg-sign-foreground/25"
const PRIMARY_BUTTON_CLASSES = "bg-primary font-bold text-primary-foreground hover:bg-[color-mix(in_oklab,var(--primary)_88%,var(--primary-foreground))]"
const HINT_KEY_CLASSES = "h-4 min-w-4 text-[0.625rem] normal-case"
const CHANGE_TONE_CLASSES: Readonly<Record<ChangeTone, string>> = {
  added: "font-semibold text-diff-added",
  modified: "font-semibold text-line-blue",
  deleted: "font-semibold text-diff-removed",
}

const withReader = (readers: ReadersByAnchorId, anchorId: string, readGroups: GroupsReader): ReadersByAnchorId =>
  new Map([...readers, [anchorId, readGroups]])

const withoutReader = (readers: ReadersByAnchorId, anchorId: string, readGroups: GroupsReader): ReadersByAnchorId =>
  readers.get(anchorId) === readGroups ? new Map([...readers].filter(([readerAnchorId]) => readerAnchorId !== anchorId)) : readers

const spansOf = (anchorIds: readonly string[]): SectionSpan[] =>
  anchorIds.flatMap((anchorId) => {
    const element = document.getElementById(anchorId)
    if (element === null) return []
    const { top, bottom } = element.getBoundingClientRect()
    return [{ anchorId, top, bottom }]
  })

const useDominantAnchorId = (anchorIds: readonly string[]): string | null => {
  const [dominantAnchorId, setDominantAnchorId] = useState<string | null>(null)
  const frameRef = useRef(NO_FRAME)
  const anchorKey = anchorIds.join(ANCHOR_SEPARATOR)

  useEffect(() => {
    const keyedAnchorIds = anchorKey === "" ? [] : anchorKey.split(ANCHOR_SEPARATOR)
    const measure = (): void => {
      frameRef.current = NO_FRAME
      setDominantAnchorId(dominantAnchorIdOf(spansOf(keyedAnchorIds), { top: coveredTopOf(), bottom: window.innerHeight }))
    }
    const scheduleMeasure = (): void => {
      if (frameRef.current === NO_FRAME) frameRef.current = requestAnimationFrame(measure)
    }
    const resizeObserver = new ResizeObserver(scheduleMeasure)
    resizeObserver.observe(document.body)
    scheduleMeasure()
    window.addEventListener("scroll", scheduleMeasure, { passive: true })
    window.addEventListener("resize", scheduleMeasure)
    return () => {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = NO_FRAME
      resizeObserver.disconnect()
      window.removeEventListener("scroll", scheduleMeasure)
      window.removeEventListener("resize", scheduleMeasure)
    }
  }, [anchorKey])

  return dominantAnchorId
}

const scrollToSection = (anchorId: string): void => {
  document.getElementById(anchorId)?.scrollIntoView({ block: "start" })
}

const ReviewNavigator = ({ rail, onSectionJump, children }: ReviewNavigatorProps) => {
  const [hintedKey, setHintedKey] = useState<string | null>(null)
  const [readersByAnchorId, setReadersByAnchorId] = useState<ReadersByAnchorId>(NO_READERS)
  const [fullScreenOwner, setFullScreenOwner] = useState<FullScreenOwner | null>(null)
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null)
  const [flashedKey, setFlashedKey] = useState<string | null>(null)
  const [sections] = useState<NavigatorSections>(() => ({
    register: (anchorId, readGroups) => {
      setReadersByAnchorId((readers) => withReader(readers, anchorId, readGroups))
      return () => {
        setReadersByAnchorId((readers) => withoutReader(readers, anchorId, readGroups))
      }
    },
    notify: () => {
      setReadersByAnchorId((readers) => new Map(readers))
    },
    onFullScreenOwnerChange: setFullScreenOwner,
  }))
  const railAnchorIds = railAnchorIdsOf(rail)
  const scrolledAnchorId = useDominantAnchorId(railAnchorIds)
  const dominantAnchorId = fullScreenOwner?.anchorId ?? scrolledAnchorId
  useGuideViewTracking(dominantAnchorId, railAnchorIds)
  const readGroups = dominantAnchorId === null ? undefined : readersByAnchorId.get(dominantAnchorId)

  const sectionGroups = readGroups?.() ?? NO_GROUPS

  const jump = useCallback((anchorId: string): void => {
    setOpenMenuKey(null)
    onSectionJump?.(anchorId)
    if (fullScreenOwner === null) {
      scrollToSection(anchorId)
      return
    }
    fullScreenOwner.onLeave()
    requestAnimationFrame(() => {
      scrollToSection(anchorId)
    })
  }, [fullScreenOwner, onSectionJump])

  const groups = useMemo(
    () => withSectionSteps(sectionGroups, sectionStepsOf(rail, dominantAnchorId, jump)),
    [sectionGroups, rail, dominantAnchorId, jump],
  )

  const flash = (key: string): void => {
    setFlashedKey(key)
    setTimeout(() => {
      setFlashedKey((current) => (current === key ? null : current))
    }, FLASH_MS)
  }

  const showHint = (key: string): void => {
    setHintedKey(key)
    setTimeout(() => {
      setHintedKey((current) => (current === key ? null : current))
    }, HINT_MS)
  }

  const handleKeyDown = useEffectEvent((event: KeyboardEvent): void => {
    if (!isNavigatorKeyEvent(event)) return
    const key = navigatorKeyOf(event)
    if (openMenuKey !== null) {
      if (key !== openMenuKey) return
      event.preventDefault()
      setOpenMenuKey(null)
      return
    }
    if (key === JUMP_KEY) {
      event.preventDefault()
      flash(key)
      setOpenMenuKey(JUMP_KEY)
      recordKeyedAction(JUMP_ACTION_ID)
      return
    }
    const control = controlOfKey(groups, key)
    if (control === null) return
    event.preventDefault()
    flash(key)
    if (control.kind === "menu") {
      setOpenMenuKey(control.key)
      recordKeyedAction(control.actionId ?? null)
    } else if (!control.isDisabled) {
      control.onRun()
      recordKeyedAction(control.actionId)
    } else if (control.disabledHint !== null) showHint(control.key)
  })

  useEffect(() => {
    const listenToKeys = (event: KeyboardEvent): void => {
      handleKeyDown(event)
    }
    window.addEventListener("keydown", listenToKeys, true)
    return () => {
      window.removeEventListener("keydown", listenToKeys, true)
    }
  }, [])

  const state = useMemo<NavigatorState>(() => ({
    rail,
    dominantAnchorId,
    groups,
    fullScreenOwner,
    openMenuKey,
    flashedKey,
    hintedKey,
    onHintedKeyChange: setHintedKey,
    onHint: showHint,
    onOpenMenuKeyChange: setOpenMenuKey,
    onJump: jump,
  }), [rail, dominantAnchorId, groups, fullScreenOwner, openMenuKey, flashedKey, hintedKey, jump])
  return (
    <NavigatorSectionsContext value={sections}>
      <NavigatorContext value={state}>{children}</NavigatorContext>
    </NavigatorSectionsContext>
  )
}

const Keycap = ({ label, className }: { readonly label: string, readonly className?: string }) => (
  <MenubarShortcut aria-hidden="true" className={className}>{label}</MenubarShortcut>
)

type Density = "full" | "short" | "keys"

const DENSITIES: readonly Density[] = ["full", "short", "keys"]

interface ControlLabelProps {
  readonly label: string
  readonly shortLabel: string | null
  readonly density: Density
}

const ControlLabel = ({ label, shortLabel, density }: ControlLabelProps) => {
  if (density === "full") return <span>{label}</span>
  if (density === "keys") return <span className="sr-only">{label}</span>
  return (
    <>
      <span aria-hidden="true">{shortLabel ?? label}</span>
      <span className="sr-only">{label}</span>
    </>
  )
}

const titleOf = (label: string, density: Density): string | undefined => (density === "full" ? undefined : label)

const KeyHints = ({ hints }: { readonly hints: readonly KeyHint[] }) => (
  <div className="-mx-1 mt-1 flex max-w-[21rem] flex-wrap items-center gap-x-3 gap-y-1.5 border-t px-3 pt-2 pb-1.5 text-[0.6875rem] text-muted-foreground">
    {hints.map(([keys, label]) => (
      <span key={label} className="inline-flex items-center gap-1">
        {keys.map((key) => <Keycap key={key} label={key} className={HINT_KEY_CLASSES} />)}
        {label}
      </span>
    ))}
  </div>
)

const Divider = () => <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-sign-foreground/20" />

const SectionRing = ({ isHere }: { readonly isHere: boolean }) => (
  <span aria-hidden="true" className={cn("size-3.5 shrink-0 rounded-full border-[2.5px] border-muted-foreground", isHere && "border-(--line,var(--primary-text)) bg-(--line,var(--primary-text))")} />
)

const SegmentSquare = () => <span aria-hidden="true" className="size-[11px] shrink-0 rounded-[2px] bg-(--line,var(--primary-text))" />

const JumpItem = ({ section, onJump }: { readonly section: JumpSection, readonly onJump: (anchorId: string) => void }) => (
  <MenubarItem onClick={() => { onJump(section.anchorId) }}>
    <SectionRing isHere={section.isHere} />
    <span className="min-w-0 flex-1 truncate">{section.label}</span>
    {section.isHere ? <span className="text-xs text-muted-foreground">{HERE_LABEL}</span> : null}
  </MenubarItem>
)

const JumpMenu = ({ navigator, density }: { readonly navigator: NavigatorState, readonly density: Density }) => {
  const menu = jumpMenuOf(navigator.rail, navigator.dominantAnchorId)
  const isOpen = navigator.openMenuKey === JUMP_KEY
  return (
    <Menubar modal={false}>
      <MenubarMenu open={isOpen} onOpenChange={(isOpening) => { navigator.onOpenMenuKeyChange(isOpening ? JUMP_KEY : null) }}>
        <MenubarTrigger
          data-flash={navigator.flashedKey === JUMP_KEY}
          data-user-action-id={JUMP_ACTION_ID}
          title={titleOf(JUMP_LABEL, density)}
          className={cn(BUTTON_CLASSES, "pl-2.5 data-popup-open:bg-sign-foreground/15")}
        >
          <ControlLabel label={JUMP_LABEL} shortLabel={null} density={density} />
          <ChevronUpIcon aria-hidden="true" className="size-3.5" />
          <Keycap label={JUMP_KEY} />
        </MenubarTrigger>
        <MenubarContent side="top" sideOffset={12} className="max-w-[21rem] min-w-[17rem]">
          <MenubarGroup>
            {menu.heading === null ? null : <MenubarLabel>{menu.heading}</MenubarLabel>}
            {menu.sections.map((section) => <JumpItem key={section.anchorId} section={section} onJump={navigator.onJump} />)}
          </MenubarGroup>
          {menu.otherGroups.length === 0
            ? null
            : (
                <>
                  <MenubarSeparator />
                  <MenubarGroup>
                    <MenubarLabel>{OTHER_SEGMENTS_LABEL}</MenubarLabel>
                    {menu.otherGroups.map((group) => (
                      <MenubarSub key={group.anchorId}>
                        <MenubarSubTrigger>
                          <SegmentSquare />
                          <span className="min-w-0 flex-1 truncate">{group.label}</span>
                        </MenubarSubTrigger>
                        <MenubarSubContent className="max-w-[21rem] min-w-[15rem]">
                          <MenubarGroup>
                            {group.label === null ? null : <MenubarLabel>{group.label}</MenubarLabel>}
                            {group.sections.map((section) => (
                              <JumpItem key={section.anchorId} section={{ ...section, isHere: false }} onJump={navigator.onJump} />
                            ))}
                          </MenubarGroup>
                        </MenubarSubContent>
                      </MenubarSub>
                    ))}
                  </MenubarGroup>
                </>
              )}
          {menu.looseSections.length === 0
            ? null
            : (
                <>
                  <MenubarSeparator />
                  {menu.looseSections.map((section) => <JumpItem key={section.anchorId} section={section} onJump={navigator.onJump} />)}
                </>
              )}
          <KeyHints hints={JUMP_HINTS} />
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}

interface ButtonControlProps {
  readonly control: NavigatorButton
  readonly isFlashed: boolean
  readonly density: Density
}

const ButtonControl = ({ control, isFlashed, density }: ButtonControlProps) => (
  <button
    type="button"
    aria-pressed={control.isPrimary ? undefined : control.isPressed}
    disabled={control.isDisabled}
    title={control.description ?? titleOf(control.label, density)}
    data-flash={isFlashed}
    data-user-action-id={control.actionId ?? undefined}
    className={cn(BUTTON_CLASSES, control.isPrimary && PRIMARY_BUTTON_CLASSES)}
    onClick={control.onRun}
  >
    <ControlLabel label={control.label} shortLabel={control.shortLabel} density={density} />
    <Keycap label={control.key} />
  </button>
)

interface HintedButtonControlProps extends ButtonControlProps {
  readonly hint: string
  readonly navigator: NavigatorState
}

const HintedButtonControl = ({ control, isFlashed, density, hint, navigator }: HintedButtonControlProps) => {
  const hintId = useId()
  return (
    <>
      <span id={hintId} hidden>{hint}</span>
      <Tooltip
        open={navigator.hintedKey === control.key}
        onOpenChange={(isOpening) => { navigator.onHintedKeyChange(isOpening ? control.key : null) }}
      >
        <TooltipTrigger
          closeOnClick={false}
          render={(
            <button
              type="button"
              aria-pressed={control.isPrimary ? undefined : control.isPressed}
              aria-disabled="true"
              aria-describedby={hintId}
              data-flash={isFlashed}
              data-user-action-id={control.actionId ?? undefined}
              className={cn(BUTTON_CLASSES, control.isPrimary && PRIMARY_BUTTON_CLASSES, "aria-disabled:cursor-default aria-disabled:opacity-45")}
              onClick={() => { navigator.onHint(control.key) }}
            />
          )}
        >
          <ControlLabel label={control.label} shortLabel={control.shortLabel} density={density} />
          <Keycap label={control.key} />
        </TooltipTrigger>
        <TooltipContent sideOffset={12}>{hint}</TooltipContent>
      </Tooltip>
    </>
  )
}

const ChoiceItem = ({ choice }: { readonly choice: NavigatorChoice }) => (
  <MenubarCheckboxItem checked={choice.isChecked} disabled={choice.isDisabled} onCheckedChange={choice.onToggle}>
    {choice.marker}
    <span className="flex-1">{choice.label}</span>
    <span className={cn("text-xs tabular-nums", choice.detailTone === null ? "text-muted-foreground" : CHANGE_TONE_CLASSES[choice.detailTone])}>{choice.detailLabel}</span>
  </MenubarCheckboxItem>
)

const SubmenuItem = ({ submenu }: { readonly submenu: NavigatorSubmenu }) => (
  <MenubarSub>
    <MenubarSubTrigger>
      <span className="flex-1">{submenu.label}</span>
      {submenu.valueLabel === null ? null : <span className="max-w-32 truncate text-xs text-muted-foreground">{submenu.valueLabel}</span>}
    </MenubarSubTrigger>
    <MenubarSubContent className="min-w-[15rem]">
      <MenubarGroup>
        <MenubarLabel>{submenu.heading}</MenubarLabel>
        {submenu.choices.map((choice) => <ChoiceItem key={choice.id} choice={choice} />)}
      </MenubarGroup>
    </MenubarSubContent>
  </MenubarSub>
)

const Badge = ({ badge }: { readonly badge: NavigatorBadge }) => (
  <>
    <span aria-hidden="true" className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sign-foreground px-1 text-[0.625rem] leading-none font-bold text-sign tabular-nums group-data-popup-open:bg-sign group-data-popup-open:text-sign-foreground">
      {badge.count}
    </span>
    <span className="sr-only">{badge.label}</span>
  </>
)

const hasSubmenu = (menu: NavigatorMenu): boolean => menu.itemGroups.flat().some((item) => item.kind === "submenu")

interface MenuControlProps {
  readonly control: NavigatorMenu
  readonly navigator: NavigatorState
  readonly density: Density
}

const MenuControl = ({ control, navigator, density }: MenuControlProps) => (
  <Menubar modal={false}>
    <MenubarMenu
      open={navigator.openMenuKey === control.key}
      onOpenChange={(isOpening) => { navigator.onOpenMenuKeyChange(isOpening ? control.key : null) }}
    >
      <MenubarTrigger
        data-flash={navigator.flashedKey === control.key}
        data-user-action-id={control.actionId}
        title={titleOf(control.label, density)}
        className={cn(BUTTON_CLASSES, "group data-popup-open:bg-sign-foreground data-popup-open:font-bold data-popup-open:text-sign")}
      >
        <ControlLabel label={control.label} shortLabel={null} density={density} />
        {control.badge === null ? null : <Badge badge={control.badge} />}
        <Keycap label={control.key} />
      </MenubarTrigger>
      <MenubarContent side="top" sideOffset={12} className="min-w-[17rem]">
        <MenubarGroup>
          <MenubarLabel>{control.heading}</MenubarLabel>
          {control.itemGroups.map((items, position) => (
            <div key={items.map((item) => item.id).join(ANCHOR_SEPARATOR)}>
              {position === 0 ? null : <MenubarSeparator />}
              {items.map((item) => (item.kind === "choice" ? <ChoiceItem key={item.id} choice={item} /> : <SubmenuItem key={item.id} submenu={item} />))}
            </div>
          ))}
        </MenubarGroup>
        <KeyHints hints={hasSubmenu(control) ? SUBMENU_HINTS : MENU_HINTS} />
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
)

interface ControlProps {
  readonly control: NavigatorControl
  readonly navigator: NavigatorState
  readonly density: Density
}

const Control = ({ control, navigator, density }: ControlProps) => {
  if (control.kind === "position") return <span className="min-w-16 px-1 text-center tabular-nums">{control.label}</span>
  if (control.kind === "menu") return <MenuControl control={control} navigator={navigator} density={density} />
  const isFlashed = navigator.flashedKey === control.key
  if (control.isDisabled && control.disabledHint !== null) {
    return <HintedButtonControl control={control} isFlashed={isFlashed} density={density} hint={control.disabledHint} navigator={navigator} />
  }
  return <ButtonControl control={control} isFlashed={isFlashed} density={density} />
}

const POSITION_KEY = "position"

const controlKeyOf = (control: NavigatorControl): string => (control.kind === "position" ? POSITION_KEY : control.key)

const COLUMN_CENTRE = "calc(var(--navigator-inset-left, 0px) + (100% - var(--navigator-inset-left, 0px) - var(--navigator-inset-right, 0px)) / 2)"
const WINDOW_GUTTER = "1.5rem"
const BOTH_SIDES = 2
const RIGHT_EDGE = "100% - var(--navigator-inset-right, 1.5rem)"

export const navigatorLeftOf = (width: number | null): string => {
  if (width === null) return COLUMN_CENTRE
  const halfWidth = `${String(width / BOTH_SIDES)}px`
  return `clamp(calc(${WINDOW_GUTTER} + ${halfWidth}), ${COLUMN_CENTRE}, calc(${RIGHT_EDGE} - ${halfWidth}))`
}

const useWidthOf = (element: HTMLElement | null): number | null => {
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    if (element === null) return undefined
    const observer = new ResizeObserver(() => {
      setWidth(element.offsetWidth)
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [element])

  return width
}

interface Fitting {
  readonly signature: string
  readonly densityIndex: number
}

const FIRST_FITTING: Fitting = { signature: "", densityIndex: 0 }

const useDensityThatFits = (bar: HTMLElement | null, availableWidth: number | null, contentSignature: string): Density => {
  const [fitting, setFitting] = useState<Fitting>(FIRST_FITTING)
  const signature = `${contentSignature}|${String(availableWidth)}`
  const densityIndex = fitting.signature === signature ? fitting.densityIndex : 0

  useEffect(() => {
    if (bar === null || availableWidth === null || densityIndex === DENSITIES.length - 1) return undefined
    const observer = new ResizeObserver(() => {
      if (bar.offsetWidth > availableWidth) setFitting({ signature, densityIndex: densityIndex + 1 })
    })
    observer.observe(bar)
    return () => {
      observer.disconnect()
    }
  }, [bar, availableWidth, signature, densityIndex])

  return DENSITIES[densityIndex]
}

export const ReviewNavigatorBar = ({ place = "page", ...props }: ReviewNavigatorBarProps & Omit<ComponentProps<"div">, "children">) => {
  const navigator = use(NavigatorContext)
  const [bar, setBar] = useState<HTMLDivElement | null>(null)
  const [track, setTrack] = useState<HTMLDivElement | null>(null)
  const width = useWidthOf(bar)
  const availableWidth = useWidthOf(track)
  const groups = (navigator?.groups ?? []).filter((group) => group.length > 0)
  const density = useDensityThatFits(bar, availableWidth, navigatorSignatureOf(groups))
  if (navigator === null || (place === "page" && navigator.fullScreenOwner !== null)) return null
  return (
    <>
      <div aria-hidden="true" ref={setTrack} className="pointer-events-none fixed bottom-0 left-6 h-0 right-[var(--navigator-inset-right,1.5rem)]" />
      <div aria-hidden="true" className="fixed bottom-0 left-0 right-[var(--navigator-band-right,0px)] z-40 h-11 bg-sign">
        <span className="absolute inset-x-0 top-0 h-1 bg-(--line,var(--primary-text))" />
      </div>
      <div
        ref={setBar}
        role="toolbar"
        aria-label={NAVIGATOR_LABEL}
        {...props}
        style={{ ...props.style, left: navigatorLeftOf(width) }}
        className={cn(
          "fixed bottom-0 z-40 flex h-10 -translate-x-1/2 items-center px-1 text-[0.8rem] whitespace-nowrap text-sign-foreground transition-[left] duration-200 ease-out",
          props.className,
        )}
      >
        <JumpMenu navigator={navigator} density={density} />
        <div key={navigator.dominantAnchorId ?? ""} className="flex items-center duration-[180ms] animate-in fade-in-0">
          {groups.map((group) => (
            <div key={group.map(controlKeyOf).find((key) => key !== POSITION_KEY) ?? POSITION_KEY} className="flex items-center gap-0.5">
              <Divider />
              {group.map((control) => <Control key={controlKeyOf(control)} control={control} navigator={navigator} density={density} />)}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default ReviewNavigator
