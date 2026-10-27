import { act, render, screen } from "@testing-library/react"
import ReviewGuideTooltips from "@/components/ReviewGuideTooltips"
import ReviewNavigator, { ReviewNavigatorBar } from "@/components/ReviewNavigator"
import { DEFAULT_GUIDE_DELAY_MS } from "@/lib/guide-tooltips/hooks"
import { guideTooltipStore, resetGuideTooltipStore } from "@/lib/guide-tooltips/store"
import type { NavigatorRail } from "@/lib/navigator-controls"

const CONTEXT_ANCHOR_ID = "segment-context"
const RAIL: NavigatorRail = { groups: [{ anchorId: "segment", label: "Requests (1/1)", sections: [{ anchorId: CONTEXT_ANCHOR_ID, label: "Context" }] }], sections: [] }
const SECTION_BOX = { x: 0, y: 100, width: 800, height: 600 }
const JUMP_BOX = { x: 400, y: 760, width: 90, height: 30 }
const EXPLORER_FILTER_BOX = { x: 200, y: 20, width: 70, height: 28 }
const FILTER_TIP_TITLE = "Too many lines of code to review?"
const STEPS_BEFORE_FILTER_TIP = 5

const ACTION_BOXES: Readonly<Partial<Record<string, typeof JUMP_BOX>>> = {
  "jump-to-action": JUMP_BOX,
  "explorer-filter-action": EXPLORER_FILTER_BOX,
}

const boxOf = (element: HTMLElement) => {
  if (element.id === CONTEXT_ANCHOR_ID) return SECTION_BOX
  return ACTION_BOXES[element.dataset.userActionId ?? ""] ?? {}
}

const ExplorerFilterButton = () => <button type="button" data-user-action-id="explorer-filter-action">Filter</button>

const renderReview = (reviewMode: "user" | "teammate", isExplorerShown = false) =>
  render(
    <ReviewNavigator rail={RAIL}>
      {isExplorerShown ? <ExplorerFilterButton /> : null}
      <section id={CONTEXT_ANCHOR_ID} data-view-section-id="context-section">Context</section>
      <ReviewNavigatorBar />
      <ReviewGuideTooltips reviewMode={reviewMode} />
    </ReviewNavigator>,
  )

const stepPastTheNextWaypointTip = (): void => {
  const state = guideTooltipStore.getState()
  state.deferTooltip("next-waypoint-tooltip", "got-it")
  state.updateTooltipState("filter-waypoint-tooltip", { viewVisible: { "code-walkthrough-section": true } })
  Array.from({ length: STEPS_BEFORE_FILTER_TIP }, () => "next-waypoint-action").forEach((actionId) => {
    guideTooltipStore.getState().sendEvent("user-action", actionId)
  })
}

const FRAME_MS = 50

const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const waitPastTheDelay = async (): Promise<void> => {
  await advance(FRAME_MS)
  await advance(DEFAULT_GUIDE_DELAY_MS)
  await advance(FRAME_MS)
  await advance(FRAME_MS)
}

describe("ReviewGuideTooltips", () => {
  const originalRect = Reflect.getOwnPropertyDescriptor(HTMLElement.prototype, "getBoundingClientRect")

  beforeEach(() => {
    resetGuideTooltipStore()
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date", "requestAnimationFrame", "cancelAnimationFrame"] })
    Reflect.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value(this: HTMLElement) {
        return DOMRect.fromRect(boxOf(this))
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    if (originalRect !== undefined) Reflect.defineProperty(HTMLElement.prototype, "getBoundingClientRect", originalRect)
  })

  it("points a teammate at Jump to a second and a half into the Context section", async () => {
    renderReview("teammate")
    await waitPastTheDelay()

    expect(screen.getByText("Go straight to what matters")).toBeTruthy()
    expect(guideTooltipStore.getState().firstSeenAt).not.toBeNull()
  })

  it("leaves the author's own review without these tips", async () => {
    renderReview("user")
    await waitPastTheDelay()

    expect(screen.queryByText("Go straight to what matters")).toBeNull()
  })

  it("points at the Filter button of Changed files after five steps between waypoints", async () => {
    stepPastTheNextWaypointTip()
    renderReview("teammate", true)
    await waitPastTheDelay()

    expect(screen.getByText(FILTER_TIP_TITLE)).toBeTruthy()
  })

  it("waits for Changed files to be open before showing the filter tip", async () => {
    stepPastTheNextWaypointTip()
    renderReview("teammate")
    await waitPastTheDelay()

    expect(screen.queryByText(FILTER_TIP_TITLE)).toBeNull()
  })

  it("leaves out the filter tip once the reader has used the navigator's filter", async () => {
    stepPastTheNextWaypointTip()
    guideTooltipStore.getState().sendEvent("user-action", "filter-action")
    renderReview("teammate", true)
    await waitPastTheDelay()

    expect(screen.queryByText(FILTER_TIP_TITLE)).toBeNull()
  })
})
