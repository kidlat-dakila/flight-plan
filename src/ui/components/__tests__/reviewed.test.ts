import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"
import { RendererHostProvider, type RendererHost } from "../../host"
import {
  WaypointBoxProvider,
  reviewHides,
  waypointHandler,
  type ReviewView,
  type WaypointBox,
} from "../waypointBox"

/**
 * Reviewed marks on the card: a reviewed card is hidden, a reader can
 * show reviewed cards again, and a link to one shows it.
 */
const host = {} as unknown as RendererHost

const box: WaypointBox = {
  stepIndex: 0,
  id: "guard",
  title: "Added the guard",
  badge: null,
  prose: { markdown: "It refuses." },
}

function view(over: Partial<ReviewView> = {}, reviewed: string[] = ["guard"]): ReviewView {
  return {
    controls: { waypoints: new Set(reviewed), files: new Set(), onChange: () => undefined },
    showReviewed: false,
    revealed: new Set(),
    ...over,
  }
}

function draw(review: ReviewView | null): string {
  const state = {
    boxes: new Map([[0, box]]),
    filter: new Set(),
    expanded: new Set(),
    toggle: () => undefined,
    current: null,
    onSelect: () => undefined,
    review,
  }
  const Block = waypointHandler.Block
  if (Block === undefined) throw new Error("the waypoint handler draws no block")
  return renderToStaticMarkup(
    createElement(
      RendererHostProvider,
      { value: host },
      createElement(
        WaypointBoxProvider,
        { state } as never,
        createElement(Block as never, {
          annotation: { name: "waypoint", query: "", data: { stepIndex: 0 } },
          children: null as ReactNode,
        } as never),
      ),
    ),
  )
}

describe("reviewed marks on a card", () => {
  test("hides a reviewed card, and keeps the code it sits on", () => {
    expect(draw(view())).not.toContain("fp-wp-box")
    expect(reviewHides(view(), "guard", 0)).toBe(true)
  })

  test("shows it again, marked, when the reader asks", () => {
    const html = draw(view({ showReviewed: true }))
    expect(html).toContain('data-reviewed="true"')
    expect(html).toContain('aria-pressed="true"')
  })

  test("shows a card a link asked for", () => {
    expect(reviewHides(view({ revealed: new Set([0]) }), "guard", 0)).toBe(false)
  })

  test("draws the control on a card nobody has reviewed", () => {
    const html = draw(view({}, []))
    expect(html).toContain("fp-review-toggle")
    expect(html).toContain('aria-pressed="false"')
  })

  test("draws no control where the page cannot store a mark", () => {
    expect(draw(null)).not.toContain("fp-review-toggle")
  })
})
