import { createElement } from "react"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, test } from "vitest"
import { RendererHostProvider } from "../../host"
import type { RendererHost } from "../../host"
import { WaypointBoxProvider, waypointHandler } from "../waypointBox"
import type { WaypointBox } from "../waypointBox"

/**
 * The needs-attention flag, drawn on the card.
 *
 * It replaced the worked example, and it answers a different question. An
 * example told a reviewer what the code does on real input, which they can work
 * out by reading it. This tells them which of forty cards is the one to slow
 * down on, which they cannot work out at all without reading all forty.
 *
 * Rendered rather than asserted on the model, because the whole feature is
 * whether the reviewer sees it: a field that reaches the component and draws
 * nothing is the same as no field.
 */
const host = {} as unknown as RendererHost

const finding = (over: Record<string, unknown> = {}) =>
  ({
    id: "f1",
    kind: "bug",
    title: "Negative hold reads as stock",
    reading: "It subtracts without checking the sign.",
    ...over,
  }) as never

const box = (over: Partial<WaypointBox> = {}): WaypointBox => ({
  stepIndex: 0,
  id: "guard",
  title: "Added the guard",
  badge: null,
  prose: { markdown: "It refuses." },
  ...over,
})

/** The box as it renders for one waypoint, open or shut. */
function draw(
  one: WaypointBox,
  open: boolean,
  filter: ReadonlySet<string> = new Set(),
): string {
  const state = {
    boxes: new Map([[one.stepIndex, one]]),
    filter,
    expanded: new Set(open ? [one.stepIndex] : []),
    toggle: () => undefined,
    current: null,
    onSelect: () => undefined,
    review: null,
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

describe("the needs-attention flag on a waypoint card", () => {
  test("draws the chip while the card is still shut", () => {
    // The point of the chip. A flag only visible after expanding is a flag
    // nobody looking for it can find.
    const html = draw(box({ needsAttention: "The retry path reaches it twice." }), false)
    expect(html).toContain("Needs Attention")
    expect(html).toContain("fp-step-flag")
  })

  test("draws the reasoning section once the card is open", () => {
    const html = draw(box({ needsAttention: "The retry path reaches it twice." }), true)
    expect(html).toContain("fp-wp-box-flag")
    expect(html).toContain("fp-wp-box-flag-head")
  })

  test("draws neither on a waypoint nobody flagged", () => {
    expect(draw(box(), false)).not.toContain("fp-step-flag")
    expect(draw(box(), true)).not.toContain("fp-wp-box-flag")
  })

  test("keeps the title beside the chip rather than replacing it", () => {
    const html = draw(box({ needsAttention: "why" }), false)
    expect(html).toContain("Added the guard")
  })
})

/**
 * A finding on the card it is about.
 *
 * It used to live in a section at the end of the document, which meant a
 * reviewer read the whole tour before learning which card carried a claim. One
 * chip on the card says it now, and the chip shows the highest kind because a
 * card with a bug and a nit is a card you stop at for the bug.
 */
describe("findings on a waypoint card", () => {
  test("draws a chip for the kind while the card is shut", () => {
    const html = draw(box({ findings: [finding()] }), false)
    expect(html).toContain("fp-step-badge")
    expect(html).toContain("bug")
  })

  test("shows the highest kind when a card carries several", () => {
    const html = draw(
      box({
        findings: [finding({ id: "a", kind: "nit" }), finding({ id: "b", kind: "bug" })],
      }),
      false,
    )
    // One chip, and it is the bug: the nit is not why anybody would stop.
    expect(html.match(/fp-step-badge/g)?.length).toBe(1)
    expect(html).toContain("bug")
  })

  test("lists every finding once the card is open", () => {
    const html = draw(
      box({
        findings: [
          finding({ id: "a", kind: "nit", title: "Naming" }),
          finding({ id: "b", kind: "bug", title: "Negative hold" }),
        ],
      }),
      true,
    )
    expect(html.match(/fp-wp-box-finding"/g)?.length).toBe(2)
    expect(html).toContain("Naming")
    expect(html).toContain("Negative hold")
  })

  test("draws no chip on a card nobody reported anything on", () => {
    expect(draw(box(), false)).not.toContain("fp-step-badge")
  })

  test("shows a finding's chip beside the attention flag, not instead of it", () => {
    const html = draw(box({ findings: [finding()], needsAttention: "why" }), false)
    expect(html).toContain("fp-step-badge")
    expect(html).toContain("fp-step-flag")
  })
})

/**
 * A filtered tour hides what was said about the code, never the code.
 *
 * The walkthrough *is* the file, so narrowing it can only take away boxes. A
 * reader who filters to bugs still sees every line; they stop seeing the
 * thirty-eight cards that had nothing to report.
 */
describe("a filtered waypoint box", () => {
  test("draws nothing when it does not match", () => {
    const html = draw(box(), false, new Set(["bug"]))
    expect(html).not.toContain("fp-wp-box")
    expect(html).not.toContain("Added the guard")
  })

  test("draws as usual when it matches the kind asked for", () => {
    const html = draw(box({ findings: [finding()] }), false, new Set(["bug"]))
    expect(html).toContain("fp-wp-box")
    expect(html).toContain("Added the guard")
  })

  test("draws as usual when it matches the attention flag", () => {
    const html = draw(box({ needsAttention: "why" }), false, new Set(["attention"]))
    expect(html).toContain("fp-wp-box")
  })

  test("draws everything when nothing is ticked", () => {
    expect(draw(box(), false, new Set())).toContain("fp-wp-box")
  })
})

/**
 * Where the callouts sit inside an opened card.
 *
 * Under the reading, not over it. The chip on the head is what announces them
 * before anything is opened, so they do not also have to interrupt — a reader
 * who opens a card wants the explanation they opened it for, not a wall of
 * warning above it.
 */
describe("the order inside an opened card", () => {
  test("puts the attention callout after the reading", () => {
    const html = draw(box({ needsAttention: "The retry path reaches it twice." }), true)
    expect(html.indexOf("fp-wp-box-prose")).toBeLessThan(html.indexOf("fp-wp-box-flag"))
  })

  test("puts the findings after the reading", () => {
    const html = draw(box({ findings: [finding()] }), true)
    expect(html.indexOf("fp-wp-box-prose")).toBeLessThan(
      html.indexOf("fp-wp-box-finding"),
    )
  })

  test("keeps both chips on the head, where they are seen while shut", () => {
    const html = draw(box({ findings: [finding()], needsAttention: "why" }), false)
    const head = html.slice(0, html.indexOf("fp-wp-box-body"))
    expect(head).toContain("fp-step-badge")
    expect(head).toContain("fp-step-flag")
  })
})
