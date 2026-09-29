import { useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useFloating,
} from "@floating-ui/react"
import { Pre } from "codehike/code"
import { buildHandlers } from "./handlers"
import { linkKey } from "../../lib/schemas/document/codeLinks"
import { isHtmlElement } from "../dom"
import type { HighlightedCode } from "codehike/code"
import type { RefObject } from "react"

/**
 * What a `code:` link shows when a reader hovers it.
 *
 * Prepared by the host, like a diagram node's excerpt and for the same reason:
 * highlighting is asynchronous and this renders during a hover, which is far
 * too late to start reading a file.
 */
export type CodeLinkExcerpt = {
  path: string
  /** The range as a label, for example `L75-90`. Empty for a whole file. */
  lines: string
  /**
   * The named lines with context either side, the named ones focused.
   *
   * Focused rather than shown alone: context is what places the code, and
   * without the focus a reader would have to count lines to find the two the
   * link was about.
   */
  code: HighlightedCode
  /**
   * File line of the excerpt's first rendered line, for the gutter.
   *
   * Load-bearing once there is context around the named lines: twenty lines
   * with no numbers cannot be matched against an editor, and the numbers are
   * also how a reader sees that the focused band sits where `lines` says.
   */
  startLine?: number
  /**
   * File line per rendered line, when the excerpt is not one contiguous window.
   *
   * Set only when a removed block was spliced back in to show a deletion: that
   * line is drawn and belongs to no file line, so the gutter cannot be a start
   * plus an offset any more. Overrides `startLine` where present, the same way
   * a proposal's numbering does.
   */
  fileNumbers?: readonly (number | null)[]
  /** Set when the link's own label could not be found in its range. */
  drifted?: boolean
}

/**
 * How long the popup waits before closing.
 *
 * The same grace a diagram card's hover uses, and for the same reason: the
 * popup sits beside the link with a gap, and crossing that gap leaves the link.
 */
const HOVER_GRACE = 140

/** Gap between the pointer and the popup, and between the popup and the view. */
const OFFSET = 8

/**
 * The widest the popup gets, before the space available shrinks it further.
 *
 * Wide enough for about eighty-five columns of the monospace font, which is
 * most real lines of code. Narrower, and the excerpt was a column of wrapped
 * fragments that had to be read sideways before it could be read at all.
 *
 * Also in `.fp-code-link-popup`, which is the cap the popup is first measured
 * at: this one only narrows it once the room either side is known.
 */
const MAX_WIDTH = 680

/**
 * The tallest the popup gets, before the space available shrinks it further.
 *
 * Room for the named lines plus ten of context either side, which is what
 * `linkWindow` gives it. At 220px that window arrived pre-scrolled, so the
 * context the padding exists to show was the half a reader could not see.
 *
 * Also in `.fp-code-link-popup`, for the same reason the width is.
 */
const MAX_HEIGHT = 420

/**
 * The size the popup will not be shrunk below, whatever the room.
 *
 * `size` reports the space left on the side the popup was placed, and that can
 * come back as nothing at all — a view measured mid-layout, a reference the
 * boundary does not contain. Taking it at its word wrote `max-width: 0px`,
 * which is not a small popup: it is an empty one, hovering does nothing
 * visible, and there is no error anywhere to say why.
 *
 * Clipped at the edge of the view is a worse popup than one that fits. It is a
 * far better one than no popup, and it is visible, which is what lets a reader
 * report it.
 */
const MIN_WIDTH = 240
const MIN_HEIGHT = 120

/**
 * The classes on the popup's code block, and the first one is load-bearing.
 *
 * `fp-pre` is what every rule written for a code block selects on, and the
 * popup had only its own class. The focus annotation was the visible casualty:
 * the handler put `data-fp-has-focus` on the element and `data-fp-focused` on
 * every line, the stylesheet asked for
 * `.fp-pre[data-fp-has-focus="true"] .fp-line[data-fp-focused="false"]`, and
 * the two never met — so the lines a link names were annotated correctly and
 * drawn exactly like the lines around them. Nothing errored, and the popup
 * looked like a feature that had not been built.
 *
 * Shared rather than restated: a second copy of the dimming rule keyed on
 * `.fp-code-link-code` would have fixed the symptom and left the next rule
 * written for code blocks to go missing here in the same silent way.
 */
export const POPUP_CODE_CLASS = "fp-pre fp-code-link-code"

/**
 * A point the popup can be anchored to, in viewport coordinates.
 *
 * The pointer rather than the link, because these labels are long: a trace
 * step reads `annotateRanges(<div.fp-interlude>, [9 ranges])`, and the
 * right-hand edge of that is a long way from wherever the reader's pointer
 * entered it. Anchored to the link, the code appeared somewhere they were not
 * looking, and it did not follow them along a label that wraps two lines.
 *
 * A virtual element rather than a real one: Floating UI asks its reference for
 * a rect and nothing else, so a zero-sized rect at the pointer is a complete
 * answer. `placement: "right"` then centres the popup on that point and puts
 * it one gap to the side.
 */
const pointAt = (x: number, y: number) => ({
  getBoundingClientRect: () => ({
    x,
    y,
    top: y,
    bottom: y,
    left: x,
    right: x,
    width: 0,
    height: 0,
  }),
})

/**
 * Shows a code excerpt when a link with one is hovered.
 *
 * Two kinds of link have one, and the map decides rather than the syntax: a
 * `code:` link in a trace, and an Overview or Implementation Overview item
 * pointing at a waypoint, which previews the code that waypoint is about. The
 * second is the reason this is keyed on the href as written — a `#slug` and a
 * `code:` target are both just keys — and it is worth having, because the two
 * lists above the tour are where a reviewer decides what to read, and until now
 * deciding meant navigating.
 *
 * One delegated listener on the root rather than a handler per link, for the
 * same reason `WaypointLinks` does it that way: the links are written into the
 * DOM by the host's Markdown renderer, so React never sees them and has nothing
 * to attach to. That is also why the hover is opened and closed by hand rather
 * than by `useHover`: those interactions need a reference element React owns,
 * and here there is none — only a pointer.
 *
 * Clicks are cancelled for a `code:` link only. No browser can follow that
 * scheme, and letting it try would leave the webview on an error page. A
 * `#slug` click belongs to `WaypointLinks`, which selects the waypoint, so it
 * is left alone.
 */
export function CodeLinks({
  excerpts,
  root,
  onOpen,
}: {
  /**
   * The excerpt for each link, keyed by its target through `linkKey`.
   *
   * Through it on both sides, because the two strings are not the same one: a
   * destination is a URL, so a path the author wrote with `[orderId]` in it
   * arrives here as `%5BorderId%5D` and matched nothing at all.
   */
  excerpts: Record<string, CodeLinkExcerpt>
  root: RefObject<HTMLElement | null>
  /** Opens the file in the editor, when the host can. */
  onOpen?: (path: string, line: number) => void
}) {
  const [shown, setShown] = useState<CodeLinkExcerpt | null>(null)
  /*
   * The view, kept in state rather than read from the ref.
   *
   * It is the boundary the popup is kept inside, and a boundary is a middleware
   * option, which is read while rendering. A ref's value at that moment is null
   * on the first pass and never announces that it has changed, so the popup
   * would be laid out against the viewport and flip at the window's edge rather
   * than at the prose column's.
   */
  const [bounds, setBounds] = useState<HTMLElement | null>(null)

  const closing = useRef<number | undefined>(undefined)
  const cancelClose = () => {
    if (closing.current !== undefined) window.clearTimeout(closing.current)
    closing.current = undefined
  }
  const closeSoon = () => {
    cancelClose()
    closing.current = window.setTimeout(() => {
      setShown(null)
    }, HOVER_GRACE)
  }

  const { refs, floatingStyles, isPositioned } = useFloating({
    open: shown !== null,
    /*
     * Fixed and portalled, so the popup is measured against the viewport and
     * cannot be clipped by the view it was hovered in. The view comes back
     * below as the boundary the middleware keeps it inside, which is the part
     * that was worth keeping: in the two-column layout the prose column is half
     * the window, and a popup that flipped at the window's edge would have sat
     * on top of the code panel instead.
     */
    strategy: "fixed",
    placement: "right",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(OFFSET),
      /*
       * To the side, and only ever to the side.
       *
       * A trigger trace is a numbered list, so a popup above or below the
       * pointer would cover the next step — the line the reader is about to
       * read. To the side covers prose they have already read. `flip` swaps
       * right for left and, by default, considers no other axis, which is
       * exactly the rule to keep.
       */
      flip({ boundary: bounds ?? undefined }),
      shift({ boundary: bounds ?? undefined, padding: OFFSET }),
      /*
       * Shrunk to what is left rather than clamped to a guess.
       *
       * The popup used to be positioned from a hardcoded 420x420 estimate,
       * because nothing had been laid out on the first frame. It is measured
       * now, so a short excerpt is centred on the pointer instead of on where
       * the tallest possible excerpt would have been.
       */
      size({
        boundary: bounds ?? undefined,
        padding: OFFSET,
        apply: ({ availableWidth, availableHeight, elements }) => {
          /*
           * Capped by the room there is, not only by the maximum.
           *
           * `flip` has already chosen the side with more space by the time this
           * runs, so this only bites in a view too narrow for the full width —
           * where the alternative is a popup running off the edge.
           */
          const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, availableWidth))
          const height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, availableHeight))
          elements.floating.style.maxWidth = `${String(width)}px`
          elements.floating.style.maxHeight = `${String(height)}px`
        },
      }),
    ],
  })

  /*
   * Opened on the lines the link names, not on the context above them.
   *
   * The excerpt is the named lines with ten either side, and a popup that
   * opens at the top of that shows ten lines of preamble — so a link into a
   * long range answered with the code above the code it was about, and the
   * reader had to scroll a hover to find out what they had pointed at.
   *
   * Two lines of context are left above the band rather than none, because a
   * band flush against the top edge reads as the start of the file.
   *
   * Waits for `isPositioned`, which is the frame `size` writes the height the
   * view has room for. Before that the popup is its full height and nothing
   * overflows, so there is no scrolling to be done and a scroll would be
   * silently dropped.
   */
  useLayoutEffect(() => {
    const popup = refs.floating.current
    if (shown === null || popup === null || !isPositioned) return

    const band = popup.querySelector<HTMLElement>('[data-fp-focused="true"]')
    if (band === null) {
      popup.scrollTop = 0
      return
    }

    // Measured rather than read off `offsetTop`, which answers for whichever
    // ancestor happens to be positioned rather than for the scroller.
    const line = band.getBoundingClientRect()
    const box = popup.getBoundingClientRect()
    const header = popup.querySelector<HTMLElement>(".fp-code-link-where")
    const covered = header === null ? 0 : header.getBoundingClientRect().height
    popup.scrollTop = Math.max(
      0,
      popup.scrollTop + line.top - box.top - covered - 2 * line.height,
    )
  }, [shown, isPositioned, refs])

  useEffect(() => {
    const element = root.current
    if (!element) return
    setBounds(element)

    /** The excerpt a link points at, or undefined. */
    const excerptOf = (link: HTMLAnchorElement): CodeLinkExcerpt | undefined =>
      excerpts[linkKey(link.getAttribute("href") ?? "")]

    /** The nearest link that has an excerpt, or null. */
    const linkAt = (target: EventTarget | null): HTMLAnchorElement | null => {
      const node = target instanceof Node ? target : null
      if (!isHtmlElement(node)) return null
      const link = node.closest<HTMLAnchorElement>("a[href]")
      if (link === null) return null
      return excerptOf(link) === undefined ? null : link
    }

    const over = (event: Event) => {
      const link = linkAt(event.target)
      if (link === null) return
      const excerpt = excerptOf(link)
      if (excerpt === undefined) return
      cancelClose()

      // The pointer decides where the popup goes, so a hover with no
      // coordinates has nowhere to put it.
      if (!(event instanceof MouseEvent)) return
      refs.setPositionReference(pointAt(event.clientX, event.clientY))
      setShown(excerpt)
    }

    const out = (event: Event) => {
      if (linkAt(event.target) === null) return
      closeSoon()
    }

    const clicked = (event: MouseEvent) => {
      const link = linkAt(event.target)
      const href = link?.getAttribute("href") ?? ""
      // A `#slug` click is the waypoint's, not this component's.
      if (link === null || !href.startsWith("code:")) return
      event.preventDefault()
      event.stopPropagation()
      const excerpt = excerptOf(link)
      if (excerpt === undefined || onOpen === undefined) return
      const line = /#L(\d+)/.exec(href)
      onOpen(excerpt.path, line === null ? 1 : Number(line[1]))
    }

    // Capturing, because `mouseenter` does not bubble and delegation needs one
    // listener rather than one per link.
    element.addEventListener("mouseover", over)
    element.addEventListener("mouseout", out)
    element.addEventListener("click", clicked)
    return () => {
      cancelClose()
      element.removeEventListener("mouseover", over)
      element.removeEventListener("mouseout", out)
      element.removeEventListener("click", clicked)
    }
    // `cancelClose` and `closeSoon` are left out on purpose: they only touch a
    // ref and a setter, so listing them would re-attach every listener on every
    // render to no effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excerpts, root, onOpen, refs])

  if (shown === null) return null
  return (
    /*
     * Out of the view and into the body.
     *
     * Nothing in the prose can clip it there, and the pointer can reach it:
     * leaving the link schedules the close, and entering the popup cancels it,
     * which is the whole of the grace period's job.
     */
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        className="fp-code-link-popup"
        role="tooltip"
        style={floatingStyles}
        onMouseEnter={cancelClose}
        onMouseLeave={closeSoon}
      >
        <div className="fp-code-link-where">
          {shown.path}
          {shown.lines === "" ? null : ` ${shown.lines}`}
          {shown.drifted === true ? (
            <span className="fp-code-link-drift" title="The label was not found in these lines">
              moved
            </span>
          ) : null}
        </div>
        <Pre
          className={POPUP_CODE_CLASS}
          code={shown.code}
          handlers={buildHandlers({
            lineNumbers: shown.startLine !== undefined,
            fileStart: shown.startLine,
            fileNumbers: shown.fileNumbers,
            wordWrap: false,
          })}
        />
      </div>
    </FloatingPortal>
  )
}
