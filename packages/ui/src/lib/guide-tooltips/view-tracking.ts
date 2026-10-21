import { isOnScreen, screenBoxOf, useLayoutChanges, visibleViewIdsOf, windowBox, type ViewCandidate, type ViewPlacement } from "@/lib/guide-tooltips/layout"
import { guideTooltipStore } from "@/lib/guide-tooltips/store"

const VIEW_SELECTOR = "[data-view-section-id]"

const VIEW_ATTRIBUTE = "data-view-section-id"

const ANCHOR_SEPARATOR = "\n"

const isRailSection = (element: Element, railAnchorIds: ReadonlySet<string>): boolean =>
  railAnchorIds.has(element.id) || [...railAnchorIds].some((anchorId) => anchorId !== "" && element.querySelector(`[id="${CSS.escape(anchorId)}"]`) !== null)

const placementOf = (element: Element, dominantView: Element | null, railAnchorIds: ReadonlySet<string>): ViewPlacement => {
  if (element === dominantView) return "dominant"
  if (dominantView?.contains(element) === true) return "inside-dominant"
  const outerView = element.parentElement?.closest(VIEW_SELECTOR) ?? null
  return outerView === null && !isRailSection(element, railAnchorIds) ? "free" : "elsewhere"
}

const viewCandidatesOf = (dominantAnchorId: string | null, railAnchorIds: ReadonlySet<string>): ViewCandidate[] => {
  const dominantView = dominantAnchorId === null ? null : document.getElementById(dominantAnchorId)?.closest(VIEW_SELECTOR) ?? null
  const viewport = windowBox()
  return [...document.querySelectorAll(VIEW_SELECTOR)].map((element) => ({
    viewId: element.getAttribute(VIEW_ATTRIBUTE) ?? "",
    placement: placementOf(element, dominantView, railAnchorIds),
    isOnScreen: isOnScreen(screenBoxOf(element), viewport),
  }))
}

export const useGuideViewTracking = (dominantAnchorId: string | null, railAnchorIds: readonly string[]): void => {
  const anchorKey = railAnchorIds.join(ANCHOR_SEPARATOR)
  useLayoutChanges(true, () => {
    const anchorIds = new Set(anchorKey.split(ANCHOR_SEPARATOR))
    guideTooltipStore.getState().setVisibleViewIds(visibleViewIdsOf(viewCandidatesOf(dominantAnchorId, anchorIds)))
  }, `${dominantAnchorId ?? ""}${ANCHOR_SEPARATOR}${anchorKey}`)
}
