import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useStore } from "zustand"
import { guideTooltipStore, type GuideEventKind } from "@/lib/guide-tooltips/store"
import { isTooltipReady, type GuideTriggers, type ReviewMode, type TriggerStates } from "@/lib/guide-tooltips/triggers"

export const DEFAULT_GUIDE_DELAY_MS = 5000

const CLOCK_TICK_MS = 60_000

const ACTION_SELECTOR = "[data-user-action-id]"

const ACTION_ATTRIBUTE = "data-user-action-id"

interface GuideTooltipOptions {
  readonly delay?: number
  readonly triggers: GuideTriggers
}

interface GuideTooltipHandle {
  readonly showTooltip: boolean
  readonly updateTooltipState: (change: TriggerStates) => void
}

interface GuideTooltipStateHandle {
  readonly sendEvent: (kind: GuideEventKind, targetId: string) => void
  readonly updateTooltipState: (tooltipId: string, change: TriggerStates) => void
}

const useNow = (): number => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, CLOCK_TICK_MS)
    return () => {
      clearInterval(timer)
    }
  }, [])

  return now
}

const useDueAfter = (isReady: boolean, delayMs: number): boolean => {
  const [isDue, setIsDue] = useState(false)

  useEffect(() => {
    if (!isReady) return undefined
    const timer = setTimeout(() => {
      setIsDue(true)
    }, delayMs)
    return () => {
      clearTimeout(timer)
      setIsDue(false)
    }
  }, [isReady, delayMs])

  return isReady && isDue
}

export const useGuideTooltip = (tooltipId: string, { delay = DEFAULT_GUIDE_DELAY_MS, triggers }: GuideTooltipOptions): GuideTooltipHandle => {
  const now = useNow()
  const triggersRef = useRef(triggers)
  const triggerSignature = JSON.stringify(triggers)

  useLayoutEffect(() => {
    triggersRef.current = triggers
  })

  useEffect(() => {
    guideTooltipStore.getState().registerTriggers(tooltipId, triggersRef.current)
    return () => {
      guideTooltipStore.getState().unregisterTriggers(tooltipId)
    }
  }, [tooltipId, triggerSignature])

  const isReady = useStore(guideTooltipStore, (state) =>
    isTooltipReady(state, tooltipId, triggers, {
      now,
      visibleViewIds: state.visibleViewIds,
      reviewMode: state.reviewMode,
      triggersById: state.triggersById,
    }))

  return {
    showTooltip: useDueAfter(isReady, delay),
    updateTooltipState: (change) => {
      guideTooltipStore.getState().updateTooltipState(tooltipId, change)
    },
  }
}

export const useGuideTooltipState = (): GuideTooltipStateHandle => ({
  sendEvent: guideTooltipStore.getState().sendEvent,
  updateTooltipState: guideTooltipStore.getState().updateTooltipState,
})

const actionElementOf = (target: EventTarget | null): Element | null =>
  target instanceof Element ? target.closest(ACTION_SELECTOR) : null

export const actionIdOf = (element: Element | null): string | null => element?.getAttribute(ACTION_ATTRIBUTE) ?? null

const recordClick = (event: MouseEvent): void => {
  const actionId = actionIdOf(actionElementOf(event.target))
  if (actionId !== null) guideTooltipStore.getState().sendEvent("user-action", actionId)
}

const recordHover = (event: PointerEvent): void => {
  const entered = actionElementOf(event.target)
  if (entered === null || entered === actionElementOf(event.relatedTarget)) return
  const actionId = actionIdOf(entered)
  if (actionId !== null) guideTooltipStore.getState().sendEvent("user-hover", actionId)
}

export const recordKeyedAction = (actionId: string | null): void => {
  if (actionId !== null) guideTooltipStore.getState().sendEvent("user-action", actionId)
}

export const useGuideTracking = (reviewMode: ReviewMode): void => {
  useEffect(() => {
    guideTooltipStore.getState().setReviewMode(reviewMode)
  }, [reviewMode])

  useEffect(() => {
    guideTooltipStore.getState().recordFirstVisit()
    document.addEventListener("click", recordClick, true)
    document.addEventListener("pointerover", recordHover, true)
    return () => {
      document.removeEventListener("click", recordClick, true)
      document.removeEventListener("pointerover", recordHover, true)
    }
  }, [])
}
