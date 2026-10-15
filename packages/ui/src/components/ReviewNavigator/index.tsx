import { ChevronUpIcon } from "lucide-react"
import { use, useEffect, useEffectEvent, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react"
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
  railAnchorIdsOf,
  type JumpSection,
  type NavigatorButton,
  type NavigatorControl,
  type NavigatorGroup,
  type NavigatorMenu,
  type NavigatorRail,
  type SectionSpan,
} from "@/lib/navigator-controls"
import { isNavigatorKeyEvent } from "@/lib/navigator-keys"
import { cn } from "@/lib/utils"

interface ReviewNavigatorProps {
  readonly rail: NavigatorRail
  readonly children: ReactNode
}

interface ReviewNavigatorBarProps {
  readonly place?: "page" | "full-screen"
}

type KeyHint = readonly [keys: readonly string[], label: string]

type ReadersByAnchorId = ReadonlyMap<string, GroupsReader>

const JUMP_KEY = "w"
const JUMP_LABEL = "Jump to"
const NAVIGATOR_LABEL = "Review navigator"
const HERE_LABEL = "Here"
const OTHER_SEGMENTS_LABEL = "Other segments"
const FLASH_MS = 180
const BAND_HEIGHT_PX = 56
const NO_FRAME = 0
const ANCHOR_SEPARATOR = "\n"
const JUMP_HINTS: readonly KeyHint[] = [[["↑", "↓"], "move"], [["→"], "sections"], [["↵"], "jump"], [["esc"], "close"]]
const MENU_HINTS: readonly KeyHint[] = [[["↑", "↓"], "move"], [["space"], "tick"], [["esc"], "close"]]
const NO_READERS: ReadersByAnchorId = new Map()
const NO_GROUPS: readonly NavigatorGroup[] = []

const BUTTON_CLASSES = "inline-flex h-[1.875rem] shrink-0 cursor-pointer items-center gap-1.5 rounded-[0.3rem] px-[0.4375rem] outline-none transition-colors duration-[180ms] ease-out hover:bg-sign-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 aria-pressed:bg-sign-foreground aria-pressed:font-bold aria-pressed:text-sign data-[flash=true]:bg-sign-foreground/25"
const PRIMARY_BUTTON_CLASSES = "bg-primary font-bold text-primary-foreground hover:bg-[color-mix(in_oklab,var(--primary)_88%,var(--primary-foreground))]"
const HINT_KEY_CLASSES = "h-4 min-w-4 text-[0.625rem] normal-case"

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
      setDominantAnchorId(dominantAnchorIdOf(spansOf(keyedAnchorIds), { top: BAND_HEIGHT_PX, bottom: window.innerHeight }))
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

const ReviewNavigator = ({ rail, children }: ReviewNavigatorProps) => {
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
  const scrolledAnchorId = useDominantAnchorId(railAnchorIdsOf(rail))
  const dominantAnchorId = fullScreenOwner?.anchorId ?? scrolledAnchorId
  const readGroups = dominantAnchorId === null ? undefined : readersByAnchorId.get(dominantAnchorId)
  const groups = readGroups?.() ?? NO_GROUPS

  const flash = (key: string): void => {
    setFlashedKey(key)
    setTimeout(() => {
      setFlashedKey((current) => (current === key ? null : current))
    }, FLASH_MS)
  }

  const handleKeyDown = useEffectEvent((event: KeyboardEvent): void => {
    if (!isNavigatorKeyEvent(event)) return
    const key = event.key.toLowerCase()
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
      return
    }
    const control = controlOfKey(groups, key)
    if (control === null) return
    event.preventDefault()
    flash(key)
    if (control.kind === "menu") setOpenMenuKey(control.key)
    else if (!control.isDisabled) control.onRun()
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
    onOpenMenuKeyChange: setOpenMenuKey,
    onJump: (anchorId) => {
      setOpenMenuKey(null)
      if (fullScreenOwner === null) {
        scrollToSection(anchorId)
        return
      }
      fullScreenOwner.onLeave()
      requestAnimationFrame(() => {
        scrollToSection(anchorId)
      })
    },
  }), [rail, dominantAnchorId, groups, fullScreenOwner, openMenuKey, flashedKey])
  return (
    <NavigatorSectionsContext value={sections}>
      <NavigatorContext value={state}>{children}</NavigatorContext>
    </NavigatorSectionsContext>
  )
}

const Keycap = ({ label, className }: { readonly label: string, readonly className?: string }) => (
  <MenubarShortcut aria-hidden="true" className={className}>{label}</MenubarShortcut>
)

const KeyHints = ({ hints, note = null }: { readonly hints: readonly KeyHint[], readonly note?: string | null }) => (
  <div className="-mx-1 mt-1 flex max-w-[21rem] flex-wrap items-center gap-x-3 gap-y-1.5 border-t px-3 pt-2 pb-1.5 text-[0.6875rem] text-muted-foreground">
    {hints.map(([keys, label]) => (
      <span key={label} className="inline-flex items-center gap-1">
        {keys.map((key) => <Keycap key={key} label={key} className={HINT_KEY_CLASSES} />)}
        {label}
      </span>
    ))}
    {note === null ? null : <p className="w-full leading-4">{note}</p>}
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

const JumpMenu = ({ navigator }: { readonly navigator: NavigatorState }) => {
  const menu = jumpMenuOf(navigator.rail, navigator.dominantAnchorId)
  const isOpen = navigator.openMenuKey === JUMP_KEY
  return (
    <Menubar modal={false}>
      <MenubarMenu open={isOpen} onOpenChange={(isOpening) => { navigator.onOpenMenuKeyChange(isOpening ? JUMP_KEY : null) }}>
        <MenubarTrigger
          data-flash={navigator.flashedKey === JUMP_KEY}
          className={cn(BUTTON_CLASSES, "pl-2.5 data-popup-open:bg-sign-foreground/15")}
        >
          <span>{JUMP_LABEL}</span>
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

const ButtonControl = ({ control, isFlashed }: { readonly control: NavigatorButton, readonly isFlashed: boolean }) => (
  <button
    type="button"
    aria-pressed={control.isPrimary ? undefined : control.isPressed}
    disabled={control.isDisabled}
    title={control.description ?? undefined}
    data-flash={isFlashed}
    className={cn(BUTTON_CLASSES, control.isPrimary && PRIMARY_BUTTON_CLASSES)}
    onClick={control.onRun}
  >
    <span>{control.label}</span>
    <Keycap label={control.key} />
  </button>
)

const MenuControl = ({ control, navigator }: { readonly control: NavigatorMenu, readonly navigator: NavigatorState }) => (
  <Menubar modal={false}>
    <MenubarMenu
      open={navigator.openMenuKey === control.key}
      onOpenChange={(isOpening) => { navigator.onOpenMenuKeyChange(isOpening ? control.key : null) }}
    >
      <MenubarTrigger
        data-flash={navigator.flashedKey === control.key}
        className={cn(BUTTON_CLASSES, "data-popup-open:bg-sign-foreground data-popup-open:font-bold data-popup-open:text-sign")}
      >
        <span>{control.label}</span>
        {control.valueLabel === null ? null : <span className="font-normal opacity-70">{control.valueLabel}</span>}
        <Keycap label={control.key} />
      </MenubarTrigger>
      <MenubarContent side="top" sideOffset={12} className="min-w-[17rem]">
        <MenubarGroup>
          <MenubarLabel>{control.heading}</MenubarLabel>
          {control.choiceGroups.map((choices, position) => (
            <div key={choices.map((choice) => choice.id).join(ANCHOR_SEPARATOR)}>
              {position === 0 ? null : <MenubarSeparator />}
              {choices.map((choice) => (
                <MenubarCheckboxItem
                  key={choice.id}
                  checked={choice.isChecked}
                  disabled={choice.isDisabled}
                  onCheckedChange={choice.onToggle}
                >
                  {choice.marker}
                  <span className="flex-1">{choice.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{choice.countLabel}</span>
                </MenubarCheckboxItem>
              ))}
            </div>
          ))}
        </MenubarGroup>
        <KeyHints hints={MENU_HINTS} note={control.hint} />
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
)

const Control = ({ control, navigator }: { readonly control: NavigatorControl, readonly navigator: NavigatorState }) => {
  if (control.kind === "position") return <span className="min-w-16 px-1 text-center tabular-nums">{control.label}</span>
  if (control.kind === "menu") return <MenuControl control={control} navigator={navigator} />
  return <ButtonControl control={control} isFlashed={navigator.flashedKey === control.key} />
}

const POSITION_KEY = "position"

const controlKeyOf = (control: NavigatorControl): string => (control.kind === "position" ? POSITION_KEY : control.key)

export const ReviewNavigatorBar = ({ place = "page", ...props }: ReviewNavigatorBarProps & Omit<ComponentProps<"div">, "children">) => {
  const navigator = use(NavigatorContext)
  if (navigator === null || (place === "page" && navigator.fullScreenOwner !== null)) return null
  const groups = navigator.groups.filter((group) => group.length > 0)
  return (
    <div
      role="toolbar"
      aria-label={NAVIGATOR_LABEL}
      {...props}
      className={cn(
        "fixed bottom-3.5 left-[calc((100%-var(--navigator-inset-right,0px))/2)] z-40 flex h-[2.875rem] -translate-x-1/2 items-center rounded-md border border-sign-foreground/16 bg-sign px-1 pt-1 pb-2 text-[0.8rem] whitespace-nowrap text-sign-foreground transition-[left] duration-200 ease-out",
        props.className,
      )}
    >
      <JumpMenu navigator={navigator} />
      <div key={navigator.dominantAnchorId ?? ""} className="flex items-center duration-[180ms] animate-in fade-in-0">
        {groups.map((group) => (
          <div key={group.map(controlKeyOf).find((key) => key !== POSITION_KEY) ?? POSITION_KEY} className="flex items-center gap-0.5">
            <Divider />
            {group.map((control) => <Control key={controlKeyOf(control)} control={control} navigator={navigator} />)}
          </div>
        ))}
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1 rounded-b-md bg-(--line,var(--primary-text))" />
    </div>
  )
}

export default ReviewNavigator
