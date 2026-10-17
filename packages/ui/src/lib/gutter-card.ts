import { useCallback, useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from "react"

interface VirtualAnchor {
  readonly contextElement: Element
  readonly getBoundingClientRect: () => DOMRect
}

interface CollisionPadding {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

export interface GutterCardPlacement {
  readonly anchor: () => Element | VirtualAnchor | null
  readonly collisionPadding: CollisionPadding
}

const CODE_ROW_SELECTOR = "[data-line]"
const CODE_START_SELECTOR = "[data-diff-mark]"
const FILE_SELECTOR = "[data-reference-scope]"
const FILE_HEADER_SELECTOR = "[data-file-header]"
const GUTTER_MARK_SELECTOR = "[data-gutter-mark]"
const ARROW_ZONE_PX = 28
const WINDOW_EDGE_PX = 8
const FOCUS_STEP_BY_KEY: ReadonlyMap<string, number> = new Map([["ArrowUp", -1], ["ArrowDown", 1]])
const SCROLL_START_WAIT_MS = 150
const SCROLL_END_WAIT_MS = 1000
const OWNER_ATTRIBUTE = "data-gutter-card-owner"
const OWNER_CHANGED_EVENT = "flight-plan:gutter-card-owner"

interface CardOwnership {
  readonly isOwner: boolean
  readonly claim: () => void
  readonly release: () => void
}

const readCardOwner = (): string | null => document.documentElement.getAttribute(OWNER_ATTRIBUTE)

const readNoCardOwner = (): null => null

const setCardOwner = (key: string | null): void => {
  if (key === null) document.documentElement.removeAttribute(OWNER_ATTRIBUTE)
  else document.documentElement.setAttribute(OWNER_ATTRIBUTE, key)
  window.dispatchEvent(new Event(OWNER_CHANGED_EVENT))
}

const subscribeToCardOwner = (notify: () => void): (() => void) => {
  window.addEventListener(OWNER_CHANGED_EVENT, notify)
  return () => {
    window.removeEventListener(OWNER_CHANGED_EVENT, notify)
  }
}

export const useGutterCardOwner = (key: string): CardOwnership => {
  const ownerKey = useSyncExternalStore(subscribeToCardOwner, readCardOwner, readNoCardOwner)
  const claim = useCallback(() => {
    setCardOwner(key)
  }, [key])
  const release = useCallback(() => {
    if (readCardOwner() === key) setCardOwner(null)
  }, [key])
  return { isOwner: ownerKey === key, claim, release }
}

export const whenScrollSettles = (onSettled: () => void): (() => void) => {
  const controller = new AbortController()
  const settle = (): void => {
    if (controller.signal.aborted) return
    controller.abort()
    onSettled()
  }
  const quietTimer = setTimeout(settle, SCROLL_START_WAIT_MS)
  const waitForScrollEnd = (): void => {
    clearTimeout(quietTimer)
    setTimeout(settle, SCROLL_END_WAIT_MS)
  }
  window.addEventListener("scroll", waitForScrollEnd, { once: true, passive: true, capture: true, signal: controller.signal })
  window.addEventListener("scrollend", settle, { once: true, capture: true, signal: controller.signal })
  return () => {
    clearTimeout(quietTimer)
    controller.abort()
  }
}

export const useReportedOpening = (isOpen: boolean, onOpenChange: (isOpen: boolean) => void): void => {
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  })
  useEffect(() => {
    onOpenChangeRef.current(isOpen)
  }, [isOpen])
}

export const GUTTER_CARD_GAP_PX = 8

export const GUTTER_CARD_WIDTH_CLASSES = "w-[min(56rem,calc(100vw-2rem))]"

export const GUTTER_CARD_PROSE_CLASSES = "max-w-none gap-2 text-sm leading-6"

export const GUTTER_CARD_COLLISION_AVOIDANCE = { side: "flip", align: "shift", fallbackAxisSide: "none" } as const

const codeStartOf = (trigger: HTMLElement | null): Element | VirtualAnchor | null => {
  const row = trigger?.closest(CODE_ROW_SELECTOR) ?? null
  const codeStart = row?.querySelector(CODE_START_SELECTOR) ?? null
  if (row === null || codeStart === null) return trigger
  return {
    contextElement: row,
    getBoundingClientRect: () => {
      const rowRect = row.getBoundingClientRect()
      return new DOMRect(codeStart.getBoundingClientRect().right, rowRect.top, ARROW_ZONE_PX, rowRect.height)
    },
  }
}

const PINNED_TOLERANCE_PX = 1

const coveredTopOf = (trigger: HTMLElement | null): number => {
  const header = trigger?.closest(FILE_SELECTOR)?.querySelector(FILE_HEADER_SELECTOR) ?? null
  if (header === null) return 0
  const pinnedTop = Number.parseFloat(getComputedStyle(header).top) || 0
  const headerRect = header.getBoundingClientRect()
  return headerRect.top <= pinnedTop + PINNED_TOLERANCE_PX ? headerRect.bottom : pinnedTop
}

export const gutterCardPlacementOf = (trigger: HTMLElement | null): GutterCardPlacement => ({
  anchor: () => codeStartOf(trigger),
  collisionPadding: {
    top: coveredTopOf(trigger) + WINDOW_EDGE_PX,
    right: WINDOW_EDGE_PX,
    bottom: WINDOW_EDGE_PX,
    left: WINDOW_EDGE_PX,
  },
})

export const useClosedOnScroll = (isOpen: boolean, onClose: () => void): void => {
  useEffect(() => {
    if (!isOpen) return undefined
    window.addEventListener("scroll", onClose, { passive: true, capture: true })
    return () => {
      window.removeEventListener("scroll", onClose, { capture: true })
    }
  }, [isOpen, onClose])
}

export const stepGutterFocus = (event: KeyboardEvent<HTMLElement>): void => {
  const step = FOCUS_STEP_BY_KEY.get(event.key)
  const file = event.currentTarget.closest(FILE_SELECTOR)
  if (step === undefined || file === null) return
  const marks = [...file.querySelectorAll<HTMLElement>(GUTTER_MARK_SELECTOR)]
  const position = marks.indexOf(event.currentTarget) + step
  if (position < 0 || position >= marks.length) return
  event.preventDefault()
  marks[position].focus()
}
