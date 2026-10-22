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

const boxOf = (element: HTMLElement) => {
  if (element.id === CONTEXT_ANCHOR_ID) return SECTION_BOX
  return element.dataset.userActionId === "jump-to-action" ? JUMP_BOX : {}
}

const renderReview = (reviewMode: "user" | "teammate") =>
  render(
    <ReviewNavigator rail={RAIL}>
      <section id={CONTEXT_ANCHOR_ID} data-view-section-id="context-section">Context</section>
      <ReviewNavigatorBar />
      <ReviewGuideTooltips reviewMode={reviewMode} />
    </ReviewNavigator>,
  )

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
})
