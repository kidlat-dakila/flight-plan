import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import GuideTooltip from "@/components/GuideTooltip"
import { DEFAULT_GUIDE_DELAY_MS, useGuideTracking } from "@/lib/guide-tooltips/hooks"
import { guideTooltipStore, resetGuideTooltipStore } from "@/lib/guide-tooltips/store"
import type { GuideTriggers } from "@/lib/guide-tooltips/triggers"

const TOOLTIP_ID = "share-tooltip"
const ANCHOR_ACTION_ID = "share-action"
const ON_SCREEN = { x: 100, y: 100, width: 80, height: 28 }

const Tracking = () => {
  useGuideTracking("teammate")
  return null
}

const renderTip = (triggers: GuideTriggers = { preFeatureUse: [ANCHOR_ACTION_ID] }, delay: number | null = 0) =>
  render(
    <>
      <Tracking />
      <button type="button" data-user-action-id={ANCHOR_ACTION_ID}>Share</button>
      <GuideTooltip
        id={TOOLTIP_ID}
        title="Share this review"
        content="Send it to a teammate."
        anchorSelector={`[data-user-action-id="${ANCHOR_ACTION_ID}"]`}
        delay={delay ?? undefined}
        triggers={triggers}
      />
    </>,
  )

const tooltipStateOf = () => guideTooltipStore.getState().tooltips[TOOLTIP_ID]

const SETTLE_MS = 20
const FRAME_MS = 50
const SHORT_OF_THE_DELAY_MS = 1000
const REST_OF_THE_DELAY_MS = DEFAULT_GUIDE_DELAY_MS - SHORT_OF_THE_DELAY_MS + FRAME_MS

const settle = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, SETTLE_MS)
    })
  })
}

describe("GuideTooltip", () => {
  const originalRect = Reflect.getOwnPropertyDescriptor(HTMLElement.prototype, "getBoundingClientRect")

  beforeEach(() => {
    resetGuideTooltipStore()
    Reflect.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value(this: HTMLElement) {
        return DOMRect.fromRect(this.dataset.userActionId === ANCHOR_ACTION_ID ? ON_SCREEN : {})
      },
    })
  })

  afterEach(() => {
    if (originalRect !== undefined) Reflect.defineProperty(HTMLElement.prototype, "getBoundingClientRect", originalRect)
  })

  it("shows its title and content at its anchor once its triggers are met", async () => {
    renderTip()

    expect(await screen.findByText("Share this review")).toBeTruthy()
    expect(screen.getByText("Send it to a teammate.")).toBeTruthy()
  })

  it("is not shown in the other review mode", async () => {
    renderTip({ reviewMode: "user" })
    await settle()

    expect(screen.queryByText("Share this review")).toBeNull()
  })

  it("closes for good with Okay, got it", async () => {
    renderTip()
    fireEvent.click(await screen.findByRole("button", { name: /Okay, got it!/ }))

    await waitFor(() => {
      expect(screen.queryByText("Share this review")).toBeNull()
    })
    expect(tooltipStateOf()).toStrictEqual({ userDeferred: { "got-it": true } })
    expect(guideTooltipStore.getState().isOff).toBe(false)
  })

  it("asks whether to keep tips after the close button, and stops them on request", async () => {
    renderTip()
    fireEvent.click(await screen.findByRole("button", { name: "Close this tip" }))

    expect(await screen.findByText("Keep showing tips?")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Stop tips" }))

    await waitFor(() => {
      expect(screen.queryByText("Keep showing tips?")).toBeNull()
    })
    expect(tooltipStateOf()).toStrictEqual({ userDeferred: { "close-button": true } })
    expect(guideTooltipStore.getState().isOff).toBe(true)
  })

  it("keeps tips when the reader answers so", async () => {
    renderTip()
    fireEvent.click(await screen.findByRole("button", { name: "Close this tip" }))
    fireEvent.click(await screen.findByRole("button", { name: /Keep tips/ }))

    await waitFor(() => {
      expect(screen.queryByText("Keep showing tips?")).toBeNull()
    })
    expect(guideTooltipStore.getState().isOff).toBe(false)
  })

  it("answers Escape with the prompt and Enter with keeping tips", async () => {
    renderTip()
    await screen.findByText("Share this review")

    fireEvent.keyDown(document.body, { key: "Escape" })
    expect(await screen.findByText("Keep showing tips?")).toBeTruthy()
    fireEvent.keyDown(document.body, { key: "Enter" })

    await waitFor(() => {
      expect(screen.queryByText("Keep showing tips?")).toBeNull()
    })
    expect(tooltipStateOf()).toStrictEqual({ userDeferred: { "close-button": true } })
    expect(guideTooltipStore.getState().isOff).toBe(false)
  })

  it("goes away once the feature it introduces is used", async () => {
    renderTip()
    await screen.findByText("Share this review")

    fireEvent.click(screen.getByRole("button", { name: "Share" }))

    await waitFor(() => {
      expect(screen.queryByText("Share this review")).toBeNull()
    })
    expect(guideTooltipStore.getState().actions[ANCHOR_ACTION_ID]?.clickCount).toBe(1)
  })

  it("waits while its anchor is not on the page", async () => {
    render(
      <GuideTooltip id={TOOLTIP_ID} title="Share this review" content="Send it." anchorSelector="[data-user-action-id='missing']" delay={0} triggers={{}} />,
    )
    await settle()

    expect(screen.queryByText("Share this review")).toBeNull()
  })

  describe("waiting for a quiet moment", () => {
    const advance = async (ms: number): Promise<void> => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
      })
    }

    const waitPastTheDelay = async (): Promise<void> => {
      await advance(FRAME_MS)
      await advance(DEFAULT_GUIDE_DELAY_MS)
      await advance(FRAME_MS)
    }

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date", "requestAnimationFrame", "cancelAnimationFrame"] })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("shows a second and a half after its triggers are met", async () => {
      renderTip(undefined, null)
      await advance(FRAME_MS)
      await advance(SHORT_OF_THE_DELAY_MS)

      expect(screen.queryByText("Share this review")).toBeNull()

      await advance(REST_OF_THE_DELAY_MS)
      await advance(FRAME_MS)

      expect(screen.getByText("Share this review")).toBeTruthy()
    })

    it("starts waiting again when the reader scrolls before it shows", async () => {
      renderTip(undefined, null)
      await advance(FRAME_MS)
      await advance(SHORT_OF_THE_DELAY_MS)
      fireEvent.scroll(window)
      await advance(REST_OF_THE_DELAY_MS)

      expect(screen.queryByText("Share this review")).toBeNull()

      await advance(SHORT_OF_THE_DELAY_MS)

      expect(screen.getByText("Share this review")).toBeTruthy()
    })

    it("steps aside while the reader scrolls or presses a key, and comes back once they stop", async () => {
      renderTip(undefined, null)
      await waitPastTheDelay()
      expect(screen.getByText("Share this review")).toBeTruthy()

      fireEvent.scroll(window)
      await advance(FRAME_MS)

      expect(screen.queryByText("Share this review")).toBeNull()

      await waitPastTheDelay()
      expect(screen.getByText("Share this review")).toBeTruthy()

      fireEvent.keyDown(document.body, { key: "d" })
      await advance(FRAME_MS)

      expect(screen.queryByText("Share this review")).toBeNull()

      await waitPastTheDelay()
      expect(screen.getByText("Share this review")).toBeTruthy()
    })

    it("stays while the reader presses its own buttons", async () => {
      renderTip(undefined, null)
      await waitPastTheDelay()

      fireEvent.pointerDown(screen.getByRole("button", { name: /Okay, got it!/ }))
      await advance(FRAME_MS)

      expect(screen.getByText("Share this review")).toBeTruthy()
    })
  })
})
