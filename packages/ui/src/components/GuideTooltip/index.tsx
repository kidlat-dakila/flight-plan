import { Popover } from "@base-ui/react/popover"
import { XIcon } from "lucide-react"
import { useEffect, useEffectEvent, useState, type ReactNode } from "react"
import { MenubarShortcut } from "@/components/blocks/menubar"
import { DEFAULT_GUIDE_DELAY_MS, useGuideTooltip } from "@/lib/guide-tooltips/hooks"
import { isOnScreen, mostPresentIndexOf, screenBoxOf, useLayoutChanges, windowBox } from "@/lib/guide-tooltips/layout"
import { guideTooltipStore } from "@/lib/guide-tooltips/store"
import type { GuideTriggers } from "@/lib/guide-tooltips/triggers"
import { isNavigatorKeyEvent } from "@/lib/navigator-keys"
import { cn } from "@/lib/utils"

export type GuideTooltipSide = "top" | "bottom" | "left" | "right"

export type GuideTooltipAlign = "start" | "center" | "end"

interface GuideTooltipProps {
  readonly id: string
  readonly title?: string | null
  readonly content: ReactNode
  readonly anchorSelector: string
  readonly side?: GuideTooltipSide
  readonly align?: GuideTooltipAlign
  readonly delay?: number
  readonly triggers: GuideTriggers
}

type Phase = "tip" | "prompt"

const GOT_IT_LABEL = "Okay, got it!"
const CLOSE_LABEL = "Close this tip"
const PROMPT_TITLE = "Keep showing tips?"
const PROMPT_CONTENT = "Tips point out features you have not tried yet. You can stop them for good."
const KEEP_TIPS_LABEL = "Keep tips"
const STOP_TIPS_LABEL = "Stop tips"
const ENTER_KEYCAP = "↵"
const ENTER_KEY = "Enter"
const ESCAPE_KEY = "Escape"
const SIDE_OFFSET_PX = 12
const COLLISION_PADDING_PX = 16
const NOT_FOR_GUIDE_KEYS = "button, a[href], summary, [role='button'], [role='menu'], [role='menuitem'], [role='menubar'], [role='listbox'], [role='option']"

const POPUP_CLASSES = "relative w-[22rem] max-w-[calc(100vw-2rem)] rounded-md bg-sign px-4 pt-[1.125rem] pb-3.5 text-sign-foreground outline-none dark:ring-1 dark:ring-sign-foreground/20 duration-[180ms] data-open:animate-in data-open:fade-in-0 motion-reduce:animate-none"
const RULE_CLASSES = "absolute inset-x-0 top-0 h-1 rounded-t-md bg-(--line,var(--primary-text))"
const ARROW_CLASSES = "size-2.5 rotate-45 rounded-[2px] bg-sign data-[side=bottom]:-top-1 data-[side=left]:-right-1 data-[side=right]:-left-1 data-[side=top]:-bottom-1"
const CLOSE_CLASSES = "absolute top-3.5 right-2.5 grid size-6 cursor-pointer place-items-center rounded-[0.3rem] text-sign-muted transition-colors duration-[180ms] ease-out hover:bg-sign-foreground/10 hover:text-sign-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
const PRIMARY_CLASSES = "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[0.3rem] bg-primary px-2.5 text-[0.8rem] font-bold text-primary-foreground transition-colors duration-[180ms] ease-out hover:bg-[color-mix(in_oklab,var(--primary)_88%,var(--primary-foreground))] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
const QUIET_CLASSES = "inline-flex h-7 cursor-pointer items-center rounded-[0.3rem] px-2.5 text-[0.8rem] text-sign-muted transition-colors duration-[180ms] ease-out hover:bg-sign-foreground/10 hover:text-sign-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"

export type KeyedTextPart = string | { readonly keycap: string }

const GuideKeycap = ({ label }: { readonly label: string }) => (
  <MenubarShortcut aria-hidden="true" className="mx-0.5 align-[0.05rem]">{label}</MenubarShortcut>
)

const partKeyOf = (part: KeyedTextPart): string => (typeof part === "string" ? `text:${part}` : `keycap:${part.keycap}`)

export const KeyedText = ({ parts }: { readonly parts: readonly KeyedTextPart[] }) => (
  <>
    {parts.map((part) => (typeof part === "string"
      ? <span key={partKeyOf(part)}>{part}</span>
      : (
          <span key={partKeyOf(part)}>
            <span className="sr-only">{part.keycap}</span>
            <GuideKeycap label={part.keycap} />
          </span>
        )))}
  </>
)

const isGuideKeyEvent = (event: KeyboardEvent): boolean =>
  isNavigatorKeyEvent(event)
  && !event.ctrlKey
  && !event.shiftKey
  && !(event.target instanceof Element && event.target.closest(NOT_FOR_GUIDE_KEYS) !== null)

const isTopmostTooltip = (tooltipId: string): boolean => guideTooltipStore.getState().shownTooltipIds.at(-1) === tooltipId

const anchorOf = (selector: string, current: Element | null): Element | null => {
  const elements = [...document.querySelectorAll(selector)]
  const viewport = windowBox()
  if (current !== null && elements.includes(current) && isOnScreen(screenBoxOf(current), viewport)) return current
  const index = mostPresentIndexOf(elements.map(screenBoxOf), viewport)
  return index === null ? null : elements[index]
}

const useGuideAnchor = (selector: string, isActive: boolean): Element | null => {
  const [anchor, setAnchor] = useState<Element | null>(null)
  useLayoutChanges(isActive, () => {
    setAnchor((current) => anchorOf(selector, current))
  }, selector)
  return isActive ? anchor : null
}

const useShownRegistration = (tooltipId: string, isOpen: boolean): void => {
  useEffect(() => {
    if (!isOpen) return undefined
    guideTooltipStore.getState().showTooltip(tooltipId)
    return () => {
      guideTooltipStore.getState().hideTooltip(tooltipId)
    }
  }, [tooltipId, isOpen])
}

const useGuideKeys = (isOpen: boolean, onKey: (event: KeyboardEvent) => void): void => {
  const handleKey = useEffectEvent(onKey)

  useEffect(() => {
    if (!isOpen) return undefined
    const listenToKeys = (event: KeyboardEvent): void => {
      handleKey(event)
    }
    window.addEventListener("keydown", listenToKeys, true)
    return () => {
      window.removeEventListener("keydown", listenToKeys, true)
    }
  }, [isOpen])
}

const GuideTooltip = ({ id, title = null, content, anchorSelector, side = "top", align = "center", delay = DEFAULT_GUIDE_DELAY_MS, triggers }: GuideTooltipProps) => {
  const { showTooltip } = useGuideTooltip(id, { delay, triggers })
  const [phase, setPhase] = useState<Phase>("tip")
  const anchor = useGuideAnchor(anchorSelector, showTooltip)
  const isOpen = showTooltip && anchor !== null

  const settle = (): void => {
    guideTooltipStore.getState().deferTooltip(id, phase === "prompt" ? "close-button" : "got-it")
  }
  const stopTips = (): void => {
    guideTooltipStore.getState().deferTooltip(id, "close-button")
    guideTooltipStore.getState().turnTipsOff()
  }

  useShownRegistration(id, isOpen)
  useGuideKeys(isOpen, (event) => {
    if (!isTopmostTooltip(id) || !isGuideKeyEvent(event)) return
    if (event.key === ENTER_KEY) {
      event.preventDefault()
      settle()
    }
    if (event.key === ESCAPE_KEY) {
      event.preventDefault()
      if (phase === "tip") setPhase("prompt")
      else settle()
    }
  })

  const heading = phase === "tip" ? title : PROMPT_TITLE
  return (
    <Popover.Root open={isOpen} modal={false}>
      <Popover.Portal>
        <Popover.Positioner
          anchor={anchor}
          side={side}
          align={align}
          sideOffset={SIDE_OFFSET_PX}
          collisionPadding={COLLISION_PADDING_PX}
          className="isolate z-50 data-[anchor-hidden]:hidden"
        >
          <Popover.Popup
            initialFocus={false}
            finalFocus={false}
            aria-live="polite"
            aria-label={heading ?? undefined}
            data-guide-tooltip={id}
            data-navigator-scope=""
            className={POPUP_CLASSES}
          >
            <span aria-hidden="true" className={RULE_CLASSES} />
            {phase === "tip"
              ? (
                  <button type="button" aria-label={CLOSE_LABEL} title={CLOSE_LABEL} data-user-action-id="guide-tooltip-close-action" className={CLOSE_CLASSES} onClick={() => { setPhase("prompt") }}>
                    <XIcon aria-hidden="true" className="size-3.5" />
                  </button>
                )
              : null}
            {heading === null ? null : <p className="pr-7 text-base leading-6 font-bold">{heading}</p>}
            <div className={cn("text-sm leading-[1.375rem] text-sign-foreground/88", heading !== null && "mt-1")}>
              {phase === "tip" ? content : PROMPT_CONTENT}
            </div>
            <div className="mt-3.5 flex items-center justify-end gap-2">
              {phase === "tip"
                ? (
                    <button type="button" data-user-action-id="guide-tooltip-got-it-action" className={PRIMARY_CLASSES} onClick={settle}>
                      {GOT_IT_LABEL}
                      <GuideKeycap label={ENTER_KEYCAP} />
                    </button>
                  )
                : (
                    <>
                      <button type="button" data-user-action-id="guide-tips-stop-action" className={QUIET_CLASSES} onClick={stopTips}>{STOP_TIPS_LABEL}</button>
                      <button type="button" data-user-action-id="guide-tips-keep-action" className={PRIMARY_CLASSES} onClick={settle}>
                        {KEEP_TIPS_LABEL}
                        <GuideKeycap label={ENTER_KEYCAP} />
                      </button>
                    </>
                  )}
            </div>
            <Popover.Arrow className={ARROW_CLASSES} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export default GuideTooltip
