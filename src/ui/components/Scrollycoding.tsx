import type { HighlightedCode } from "codehike/code"
import { CodeLinks, type CodeLinkExcerpt } from "./CodeLinks"
import { panelAnchorOf, panelRuns } from "./panelRuns"
import { FilterMenu } from "./FilterMenu"
import type { WaypointFinding } from "../../lib/schemas/document/schema"
import { useHost } from "../host"
import { SelectionReference } from "./SelectionReference"
import {
  Selection,
  SelectionProvider,
  useSelectedIndex,
} from "codehike/utils/selection"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type RefObject,
} from "react"
import { BlastGraph } from "./BlastGraph"
import type { Blast, BlastProblem } from "../../lib/schemas/diagram/blast"
import { buildHandlers } from "./handlers"
import { HostMarkdown } from "./HostMarkdown"
import { OutwardLink } from "./OutwardLink"
import { waypointSlugs } from "../parse/anchor"
import { SmoothPre } from "./SmoothPre"
import { Diagram, type DiagramExcerpts } from "./Diagram"
import type { Diagram as DiagramIR, DiagramProblem } from "../../lib/schemas/diagram/schema"
import { VscodeBadge, VscodeIcon } from "../vscode"
import type { FindingKind } from "../../lib/schemas/document/schema"
import type { Prose } from "../document/view"
import type { PanelStep } from "./panelRuns"
import {
  useWaypointBoxState,
  WaypointBoxProvider,
  matchesFilter,
  reviewHides,
  ReviewToggle,
  FILTER_KEYS,
  type FilterKey,
  type ReviewControls,
  type ReviewView,
  type WaypointBox,
} from "./waypointBox"

/** A step with its code already highlighted, ready to render. */
/**
 * A code panel for a diagram node, which has code but no prose.
 *
 * A node that no waypoint explains still has code worth reading, and until now
 * clicking one did something else entirely — it left for the file, or for
 * github.com. These are appended to the same `Selection` the waypoints use, so
 * a click on any card puts its code in the same panel, animated the same way.
 * A separate type rather than a `PreparedStep` with the prose fields left
 * empty, because a node is not a waypoint and a type that says so is cheaper
 * than a comment explaining why five fields are blank.
 */
/** A diagram node's card text, and the two actions that go under it. */
export type NodeHeading = {
  label: string
  sublabel?: string
  description?: string
  annotation?: string
  source?:
    | { kind: "editor"; path: string; line: number }
    | { kind: "link"; href: string; label: string }
    | null
}

export type NodePanel = {
  /** The node's id, so the diagram can ask for its own panel by name. */
  id: string
  /**
   * What the card says, repeated above the code.
   *
   * A waypoint's panel needs none of this: its prose is in the column beside
   * it. A node's is on a card the reader has just clicked away from, and in
   * full screen the board is behind an overlay — so without it the panel is a
   * range of code with nothing saying which node it belongs to.
   */
  label: string
  sublabel?: string
  description?: string
  /** `owner/repo@sha:path#L1-2`, ready for the clipboard. Built by the host. */
  annotation?: string
  /**
   * Where "Go to source" sends the reader.
   *
   * Decided by the host, and it differs by node: a node the change touches goes
   * to the pull request, where the reader can see it as a diff and comment on
   * it; one it does not goes to the file in their own editor, because there is
   * no diff to look at and the local copy is the same code.
   */
  source?:
    | { kind: "editor"; path: string; line: number }
    | { kind: "link"; href: string; label: string }
    | null
  code: HighlightedCode
  filePath: string | null
  fileStart: number
  fileNumbers?: readonly (number | null)[]
  windowed: boolean
  anchor?: "matched" | "repaired" | "lost" | "none"
  shifted?: number
  fileLink?: { href: string; label: string } | null
}

export type PreparedStep = {
  /** The waypoint's or finding's own id, which a copied reference names. */
  id: string
  title: string
  /** A document-level finding's kind, drawn as its chip. See `ViewStep`. */
  badge: FindingKind | null
  prose: Prose
  /**
   * Why a reviewer must not skim this one, when the agent said so.
   *
   * Drawn twice: as a chip beside the title, which is what makes it findable
   * while everything is collapsed, and as a section above the reading once the
   * card is open. Absent on the great majority of cards, which is the point —
   * a flag on every card points at nothing.
   */
  needsAttention?: string
  /**
   * What is wrong with this code, where the agent found something.
   *
   * The highest kind drives the chip and the colour of the card's marks; the
   * whole list renders inside the opened card. Absent on most waypoints.
   */
  findings?: readonly WaypointFinding[]
  /**
   * The same panel with a finding's fix applied, when one proposes a fix.
   *
   * Prepared up front beside the real code, because highlighting is async and a
   * click is too late to start it. A toggle on the panel swaps between them,
   * and it is off by default: what a reader sees without asking is the code
   * that is actually there, which is what the rest of this format guarantees.
   */
  fixed?: {
    code: HighlightedCode
    fileNumbers?: readonly (number | null)[]
    fileStart: number
  }
  code: HighlightedCode
  /** Reference to the *code*, for the panel's own copy button. */
  annotation?: string
  /**
   * Where the reader goes to see this code in context.
   *
   * Two kinds, decided by the host. `editor` when the file on disk is the file
   * the waypoint was written against; `link` otherwise, because opening the
   * wrong version at the right line numbers is worse than leaving the editor.
   */
  open?:
    | { kind: "editor"; path: string; line: number }
    | { kind: "link"; href: string }
    | null
  /**
   * Repository path the code came from, or null when it was pasted into the
   * document. Set means the panel numbers lines against the file and a selection
   * copies a path.
   */
  filePath: string | null
  /** File line of the first rendered line. Only meaningful with `filePath`. */
  fileStart: number
  /**
   * File line per rendered line, when the block is spliced rather than windowed.
   *
   * Set only for a proposal. `fileStart` cannot describe spliced code, because
   * the proposed lines have no file line and the lines after them still carry
   * today's numbers rather than the ones the change would give them.
   */
  fileNumbers?: readonly (number | null)[]
  /** True when the block contains code that does not exist yet. */
  proposed?: boolean
  /**
   * Where these lines live outside the editor, if anywhere.
   *
   * A walkthrough is read beside the pull request it describes, and a reader
   * who wants to comment, or to see the change as a diff, has to be able to
   * get there. The host builds it, because only the host knows what the code
   * is being read *for*.
   */
  fileLink?: { href: string; label: string } | null
  /** True when only part of the file is shown, so the reader can be told. */
  windowed: boolean
  /**
   * What the anchor check concluded.
   *
   * Shown, not swallowed. A repaired range is worth a quiet note; a lost one is
   * the reader being told the walkthrough no longer knows where its own subject
   * went, which is exactly the failure line numbers hide.
   */
  anchor?: "matched" | "repaired" | "lost" | "none"
  /** How far a repaired range moved. */
  shifted?: number
}

/**
 * Copies the step's code.
 *
 * The text is `HighlightedCode.code`, not `.value`: `.code` has the annotation
 * comments removed, so `// !mark` and friends do not land on the clipboard.
 * Feedback is the icon swapping to a tick, which is what Code Hike's own copy
 * button does.
 */
/**
 * Copies a reference to the code on show, not the code itself.
 *
 * The same string the diagram's hover card copies, and the same reason: it is
 * what an assistant needs to fetch these exact lines, and it survives being
 * pasted into a chat running somewhere else. The code button beside it is for
 * the other case, where the reader wants the text.
 */
function CopyAnnotationButton({ reference }: { reference: string }) {
  const host = useHost()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => {
      setCopied(false)
    }, 1200)
    return () => {
      window.clearTimeout(timer)
    }
  }, [copied])

  return (
    <button
      type="button"
      className="fp-code-action"
      title={copied ? "Copied" : `Copy the annotation path: ${reference}`}
      aria-label="Copy annotation path"
      onClick={(event) => {
        event.stopPropagation()
        navigator.clipboard.writeText(reference).then(
          () => {
            setCopied(true)
          },
          () => {
            host.notify("Could not copy the annotation path")
          },
        )
      }}
    >
      <VscodeIcon name={copied ? "check" : "copy"} />
    </button>
  )
}

/** The same copy, with its name on it, for the row under a node's description. */
function CopyAnnotationText({ reference }: { reference: string }) {
  const host = useHost()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => {
      setCopied(false)
    }, 1200)
    return () => {
      window.clearTimeout(timer)
    }
  }, [copied])

  return (
    <button
      type="button"
      className="fp-code-heading-action"
      title={`Copy the annotation path: ${reference}`}
      onClick={(event) => {
        event.stopPropagation()
        navigator.clipboard.writeText(reference).then(
          () => {
            setCopied(true)
          },
          () => {
            host.notify("Could not copy the annotation path")
          },
        )
      }}
    >
      <VscodeIcon name={copied ? "check" : "copy"} />
      {copied ? "Copied" : "Copy annotation"}
    </button>
  )
}

/**
 * Takes the reader to the code, wherever the host said that is.
 *
 * Two destinations and the host chooses between them, because only it knows
 * which files the change touched: a node the change touches goes to the pull
 * request, and one it does not goes to the file in the editor.
 */
function GoToSourceButton({
  source,
}: {
  source: NonNullable<NodeHeading["source"]>
}) {
  const host = useHost()
  if (source.kind === "link") {
    return (
      <OutwardLink
        className="fp-code-heading-action"
        href={source.href}
        title={`Go to the source ${source.label}`}
      >
        <VscodeIcon name="link-external" />
        Go to source
      </OutwardLink>
    )
  }
  const openFile = host.openFile
  return (
    <button
      type="button"
      className="fp-code-heading-action"
      title={`Open ${source.path} at line ${String(source.line)}`}
      onClick={(event) => {
        event.stopPropagation()
        openFile(source.path, source.line)
      }}
    >
      <VscodeIcon name="go-to-file" />
      Go to source
    </button>
  )
}

function CopyCodeButton({ text }: { text: string }) {
  const host = useHost()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => {
      setCopied(false)
    }, 1200)
    return () => {
      window.clearTimeout(timer)
    }
  }, [copied])

  return (
    <button
      type="button"
      className="fp-code-copy"
      aria-label={copied ? "Code copied" : "Copy code"}
      data-copied={copied ? "true" : undefined}
      onClick={(event) => {
        event.stopPropagation()
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true)
          },
          () => {
            host.notify("Could not copy the code")
          },
        )
      }}
    >
      <VscodeIcon name={copied ? "check" : "copy"} />
    </button>
  )
}

/**
 * A full-width block above or below the tour, ready to draw.
 *
 * Built from the document's own structure (`documentView`): the prose is HTML
 * already, the diagram and the blast radius already checked.
 */
export type PreparedBlock =
  | {
      kind: "blast"
      level: number
      blast: Blast | null
      problems: BlastProblem[]
    }
  | {
      kind: "diagram"
      level: number
      diagram: DiagramIR | null
      problems: DiagramProblem[]
      excerpts: DiagramExcerpts
    }
  | {
      kind: "prose"
      html: string
      level: number
    }

/** One file of the tour, or the findings; `steps` index the step list. */
export type TourSection = {
  key: string
  /** Whether the section is a file, which a reader can mark as reviewed. */
  file: boolean
  /** The file's path as HTML, for a section with no waypoints. Else empty. */
  titleHtml: string
  /** The file's summary as HTML. Empty when there is none. */
  summaryHtml: string
  steps: readonly number[]
}

/** Everything the renderer draws, in the regions it draws them in. */
export type PreparedLayout = {
  /** Title, context, overview, implementation, diagram, blast. */
  lead: PreparedBlock[]
  /** The tour's own heading and note, where the filter sits. */
  intro: PreparedBlock[]
  sections: TourSection[]
  /** Every card, in document order. */
  steps: PreparedStep[]
}

export type ScrollycodingProps = {
  layout: PreparedLayout
  /**
   * The reader's reviewed marks, where the page can store them. Absent
   * in the webview until it reads the API: no controls are drawn.
   */
  review?: ReviewControls
  /**
   * Excerpts for the `code:` links in prose, keyed by the href as written.
   *
   * Prepared by the host for the same reason a diagram node's are: highlighting
   * is asynchronous, and a hover is far too late to start reading a file.
   */
  codeLinks?: Record<string, CodeLinkExcerpt>
  /**
   * How the document is filed, for a copied prose reference: the plan ref
   * the `toolHint` tool takes, for example `review:acme/storefront#412`.
   */
  planRef: string
  /** MCP tool named in copied references. */
  toolHint: string
  codeColumnWidth: number
  /**
   * Repository and commit for selections in files the reader cannot open.
   *
   * Applied per file: a path the host says is openable locally needs no
   * qualification, and one it does not is qualified so an assistant fetches the
   * right bytes rather than whatever is on disk.
   */
  qualify?: { repo: string; sha: string; unlessLocal: string[] } | null
  /**
   * A panel per diagram node, so a card with no waypoint still has code.
   *
   * Appended to the waypoints' panels rather than kept apart, because the code
   * column shows exactly one of them and `Selection` picks by index.
   */
  nodePanels?: readonly NodePanel[]
  lineNumbers: boolean
  wordWrap: boolean
  /** Called when the divider is dragged, so the width can be remembered. */
  onCodeColumnWidthChange: (width: number) => void
}

/**
 * Trigger band for Code Hike's scroll selection, in viewport coordinates.
 *
 * Code Hike builds its IntersectionObserver with `root: null` and derives the
 * band from `document.documentElement.clientHeight`, which assumes the page
 * itself scrolls. Here the scroller is `.fp-scrolly`, not the page, so the
 * default band lands in the wrong place whenever that scroller is not the full
 * height of the viewport. Passing an explicit band pins it to the scroller.
 */
type TriggerBand = { top: number; height: number }

/** What the layout needs to know about the view the document is rendered in. */
type PaneMetrics = {
  /** What was measured, kept so the next measurement can be compared to it. */
  raw: RawBand
  band: TriggerBand
  /**
   * Height of the view, for the sticky code column.
   *
   * Measured, which an earlier note here called the thing a sticky version got
   * wrong — and it was right, while the split ran the whole height of the view.
   * It no longer does: full-width content above and below it has to scroll
   * past, so the scroller is the page again and the code column's height stops
   * being structural. Measuring is now the price of the layout rather than a
   * way of avoiding one.
   *
   * Unused in the stacked layout, where the code panel is simply as tall as its
   * content and the root is not the view.
   */
  viewHeight: number
}

/**
 * One shared empty map, so a document with no code links is a stable prop.
 *
 * `CodeLinks` keys its effect on the excerpts, and an object literal default
 * would be a new object every render, which would tear the delegated listener
 * down and rebuild it on every scroll.
 */
const EMPTY_CODE_LINKS: Record<string, CodeLinkExcerpt> = {}

/** Rounded, so dragging a split does not rebuild the observer every frame. */
const BAND_QUANTUM = 48

function quantize(value: number): number {
  return Math.round(value / BAND_QUANTUM) * BAND_QUANTUM
}

/**
 * The band before it is rounded, which is what has to be compared.
 *
 * `centre` is where the trigger line sits in the viewport and `thickness` is
 * how deep it is, both in raw pixels.
 */
export type RawBand = { centre: number; thickness: number }

/** The raw band for a view, from where it starts and how much of it shows. */
export function measureBand(top: number, visible: number): RawBand {
  return { centre: top + visible * 0.45, thickness: visible * 0.1 }
}

/**
 * Keeps the band where it is unless the view has genuinely moved.
 *
 * A band change costs the reader their place: Code Hike's `Scroller` ignores a
 * changed `rootMargin` — its effect lists only the window height — so the only
 * way to apply a new band is to remount the provider that holds the selected
 * waypoint. Moving the band is therefore expensive and moving it by a pixel is
 * worth nothing.
 *
 * Rounding to a quantum was the first attempt and it is not enough. A view
 * whose 45% lands on a rounding tie sits on a knife edge — at 800px it is
 * exactly 7.5 quanta — and one pixel of resize then moves the rounded band a
 * whole quantum. That is what made this intermittent: some view heights were
 * solid and others fired on every pixel.
 *
 * The comparison has to happen **before** rounding, because after rounding a
 * one-pixel resize and a hundred-pixel resize look identical: both move the
 * band by exactly one quantum. Summed across both edges, so two small drifts
 * in the same direction still count: the aim is to stop flicker, not to pin
 * the band wherever it first landed.
 */
export function settleBand(previous: RawBand | null, next: RawBand): RawBand {
  if (previous === null) return next
  const drift =
    Math.abs(previous.centre - next.centre) +
    Math.abs(previous.thickness - next.thickness)
  return drift < BAND_QUANTUM ? previous : next
}

/** The rounded band the observer is given, from a settled raw one. */
export function quantizeBand(raw: RawBand): TriggerBand {
  return {
    top: quantize(raw.centre),
    height: Math.max(BAND_QUANTUM, quantize(raw.thickness)),
  }
}

/**
 * The waypoint a new provider may be put back on, or null to leave it alone.
 *
 * Zero is "leave it alone" rather than "waypoint one", because a fresh
 * provider already starts there and restoring it would be a no-op that still
 * costs a render. Anything at or past the end belongs to a different document:
 * the memory outlives one document, and landing on waypoint 7 of a document
 * that has four is worse than starting at the top.
 */
export function restorableIndex(remembered: number, count: number): number | null {
  if (!Number.isInteger(remembered)) return null
  if (remembered <= 0) return null
  return remembered < count ? remembered : null
}

/**
 * Measures the view, so the scroll trigger can be pinned to it.
 *
 * The element passed in is the layout root, which is exactly the view box: it
 * is full height and does not scroll. That makes its bounding rect the view
 * rect, with no need to hunt for a scroll container.
 */
function usePaneMetrics(
  ref: RefObject<HTMLElement | null>,
): PaneMetrics | null {
  const [metrics, setMetrics] = useState<PaneMetrics | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const measure = () => {
      const viewportHeight =
        element.ownerDocument.documentElement.clientHeight
      // Laid out before it has been sized, which happens in an iframe or a
      // webview. The ResizeObserver below will call back once it has a size.
      if (viewportHeight === 0) return

      const rect = element.getBoundingClientRect()
      // The band has to sit where the reader is actually looking. In the
      // two-column layout the root is the view, so its rect is the answer. In
      // the stacked layout the root is taller than the viewport and the page
      // scrolls, so the answer is the visible slice of it. Falling back to the
      // viewport also breaks a deadlock: an unsized root would otherwise never
      // produce a band, so nothing would render, so it would never gain a size.
      const top = Math.max(0, rect.top)
      const bottom = Math.min(viewportHeight, rect.bottom)
      const visible = bottom - top
      const start = visible > 0 ? top : 0
      const height = visible > 0 ? visible : viewportHeight

      // Viewport coordinates, because the observer's root is the viewport.
      const measured = measureBand(start, height)
      // The root fills the view and does not scroll — the scroller is inside
      // it — so its own client height is the view's, whatever is scrolled.
      const viewHeight = element.clientHeight

      setMetrics((previous) => {
        /*
         * The raw band is settled against the one in use, so a pixel of resize
         * cannot move it and cannot cost the reader their waypoint.
         *
         * `viewHeight` is not settled: it only sizes the code column, where a
         * pixel is invisible and changing it costs a style recalculation
         * rather than a remount.
         */
        const raw = settleBand(previous?.raw ?? null, measured)
        if (previous && previous.raw === raw && previous.viewHeight === viewHeight) {
          return previous
        }
        return { raw, band: quantizeBand(raw), viewHeight }
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener("resize", measure)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [ref])

  return metrics
}

/**
 * The line a step is about, so the code panel can bring it into view.
 *
 * **A mark wins over the focus**, which reverses what this did. The reasoning
 * before was that a focus is the clearest statement of intent — but a
 * reference *always* produces a focus, so a focus is not a statement of intent at
 * all, it is just the range. A mark is the line the author pointed at inside
 * that range, and it is the narrower of the two.
 *
 * Nesting is what forced the question. A child waypoint deliberately shares its
 * parent's range so the code panel does not re-window, and says which block it
 * is about with `!mark`. While focus won, every child in a breakdown centred the
 * panel on the same line as the parent — so a parent range taller than the panel
 * left the child's block off screen, with nothing to scroll to it.
 *
 * **A mark counts only inside the focus.** A mark is narrower than the focus
 * only when the author wrote it that way. A mark taken from a hunk is the whole
 * hunk, and a new file's one hunk is the whole file, so every waypoint of a new
 * file marked line 1 and landed there. A mark that overlaps the focus is clipped
 * to it; a mark wholly outside it is used only when no mark overlaps.
 *
 * `diff` and `callout` remain fallbacks for a step that has neither. A step with
 * no annotations has no particular line, and the panel scrolls back to the top.
 */
export function targetLineNumber(code: HighlightedCode): number | null {
  const focus = code.annotations.find((annotation) => annotation.name === "focus")
  if (focus !== undefined && "fromLineNumber" in focus) {
    for (const annotation of code.annotations) {
      if (annotation.name !== "mark" || !("fromLineNumber" in annotation)) continue
      const inside =
        annotation.fromLineNumber <= focus.toLineNumber &&
        annotation.toLineNumber >= focus.fromLineNumber
      if (inside) return Math.max(annotation.fromLineNumber, focus.fromLineNumber)
    }
  }
  for (const name of ["mark", "focus", "diff", "callout"]) {
    for (const annotation of code.annotations) {
      if (annotation.name !== name) continue
      return "fromLineNumber" in annotation
        ? annotation.fromLineNumber
        : annotation.lineNumber
    }
  }
  return null
}

/** Centres the step's target line inside the code panel's own scroller. */
function useScrollToTargetLine(
  panelRef: RefObject<HTMLElement | null>,
  code: HighlightedCode,
) {
  useEffect(() => {
    const pre = panelRef.current?.querySelector<HTMLElement>(".fp-pre")
    if (!pre) return

    const line = targetLineNumber(code)
    const target =
      line === null
        ? null
        : pre.querySelector<HTMLElement>(`[data-fp-line="${line}"]`)

    /*
     * Instant, not smooth, and for the same reason the diagram's jump is.
     *
     * An animated scroll is one more thing that can be dropped, and this one
     * has to land. It is asked for at the moment the panel re-renders, and the
     * distance is often the whole file: a reference into a file of six hundred
     * lines or fewer is shown whole, so a waypoint about line 335 needs six
     * thousand pixels of travel inside an element whose contents are being
     * replaced under the animation. A cancelled animation leaves the reader
     * looking at line one of a file whose interesting part is far below the
     * fold, which reads as the click having done nothing at all.
     *
     * Reduced motion does not come into it. Nothing is being animated.
     */
    if (!target) {
      pre.scrollTo({ top: 0, behavior: "auto" })
      return
    }

    // Measured rather than using offsetTop, which depends on which ancestor
    // happens to be positioned.
    const preRect = pre.getBoundingClientRect()
    const lineRect = target.getBoundingClientRect()
    const delta =
      lineRect.top - preRect.top - (pre.clientHeight - lineRect.height) / 2
    pre.scrollTo({ top: Math.max(0, pre.scrollTop + delta), behavior: "auto" })
  }, [panelRef, code])
}

function CodePanel({
  code,
  filePath,
  fileStart,
  fileNumbers,
  proposed,
  windowed,
  fileLink,
  anchor,
  shifted,
  moved,
  heading,
  annotation,
  lineNumbers,
  wordWrap,
  waypoint,
  fixed,
}: {
  code: HighlightedCode
  filePath: string | null
  fileStart: number
  fileNumbers?: readonly (number | null)[]
  proposed?: boolean
  windowed: boolean
  anchor?: "matched" | "repaired" | "lost" | "none"
  shifted?: number
  /** A member of a shared panel was repaired, whatever `anchor` says. */
  moved?: boolean
  fileLink?: { href: string; label: string } | null
  /** A diagram node's own card text, shown above its code. Waypoints have none. */
  heading?: NodeHeading
  /** Reference to the code on show, for the header's copy button. */
  annotation?: string
  lineNumbers: boolean
  wordWrap: boolean
  /** Splice each waypoint's prose box above the line it names. */
  waypoint?: boolean
  /** The same code with a finding's fix applied, when one proposes a fix. */
  fixed?: {
    code: HighlightedCode
    fileNumbers?: readonly (number | null)[]
    fileStart: number
  }
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  /*
   * Off by default, and reset whenever the panel's code changes.
   *
   * A toggle that survived scrolling to the next waypoint would leave a reader
   * looking at proposed code on a card that never proposed any, with nothing on
   * screen to say so. The real file is what the format promises; the fix is
   * something you ask for, one card at a time.
   */
  const [showingFix, setShowingFix] = useState(false)
  /*
   * Collapsed hides the code and keeps the header.
   *
   * Reset with the code, like the fix toggle above and for the same reason: a
   * panel that stayed collapsed as the reader scrolled on would hide the next
   * card's code without them having asked, and the only clue would be a chevron
   * they never pressed.
   */
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    setShowingFix(false)
    setCollapsed(false)
  }, [code])
  const previewing = showingFix && fixed !== undefined
  const shown = previewing ? fixed.code : code
  useScrollToTargetLine(panelRef, code)

  return (
    <div
      className="fp-code-panel"
      ref={panelRef}
      style={code.style}
      data-fp-file={filePath ?? undefined}
    >
      <div className="fp-code-header">
        {/*
          First, before the path it hides.
          
          A control that acts on everything below it belongs at the start of the
          row: at the end it read as a third copy action, and a reader looking
          for a way to fold the panel looked where folding controls are, which
          is the left.
        */}
        <button
          type="button"
          className="fp-code-heading-action fp-code-collapse"
          aria-expanded={!collapsed}
          title={collapsed ? "Show the code" : "Hide the code"}
          onClick={(event) => {
            event.stopPropagation()
            setCollapsed((was) => !was)
          }}
        >
          <VscodeIcon name={collapsed ? "chevron-right" : "chevron-down"} />
        </button>
        <span className="fp-code-filename">{code.meta}</span>
        {proposed ? (
          <VscodeBadge
            className="fp-code-note fp-code-note-proposed"
            title="This code does not exist yet. It is shown spliced into the file it would change, so the lines marked + are the proposal and everything else is the file as it is now."
          >
            proposed
          </VscodeBadge>
        ) : null}
        {windowed ? (
          <VscodeBadge
            className="fp-code-note"
            title="The file is too long to show whole"
          >
            excerpt
          </VscodeBadge>
        ) : null}
        {anchor === "repaired" || moved === true ? (
          <VscodeBadge
            className="fp-code-note"
            title={`The lines moved ${shifted === undefined ? "" : `by ${String(shifted)} `}since this waypoint was written. The range was corrected from its anchor.`}
          >
            moved
          </VscodeBadge>
        ) : null}
        {anchor === "lost" ? (
          <VscodeBadge
            className="fp-code-note fp-code-note-lost"
            title="The anchored code is gone, or appears more than once. Nothing is focused, because focusing the recorded lines would point at the wrong code."
          >
            anchor lost
          </VscodeBadge>
        ) : null}
        {fileLink ? (
          <OutwardLink
            className="fp-code-link"
            href={fileLink.href}
            title="Open these lines in the pull request"
          >
            {fileLink.label}
          </OutwardLink>
        ) : null}
        {annotation === undefined ? null : (
          <CopyAnnotationButton reference={annotation} />
        )}
        {code.code === "" ? null : <CopyCodeButton text={code.code} />}
      </div>
      {heading === undefined ? null : (
        // A diagram node's card text. Rendered here rather than left on the
        // board because the reader has clicked away from the card, and in full
        // screen the board is behind an overlay.
        <div className="fp-code-heading">
          <p className="fp-code-heading-title">{heading.label}</p>
          {heading.sublabel === undefined ? null : (
            <p className="fp-code-heading-sub">{heading.sublabel}</p>
          )}
          {heading.description === undefined ? null : (
            <HostMarkdown
              className="fp-code-heading-prose"
              markdown={heading.description}
            />
          )}
          {heading.annotation === undefined && heading.source == null ? null : (
            <div className="fp-code-heading-actions">
              {heading.annotation === undefined ? null : (
                <CopyAnnotationText reference={heading.annotation} />
              )}
              {heading.source == null ? null : (
                <GoToSourceButton source={heading.source} />
              )}
            </div>
          )}
        </div>
      )}
      {collapsed || fixed === undefined ? null : (
        <button
          type="button"
          className="fp-fix-toggle"
          data-showing={previewing}
          aria-pressed={previewing}
          onClick={() => {
            setShowingFix((was) => !was)
          }}
        >
          {previewing ? "Show current" : "Preview fix"}
        </button>
      )}
      {collapsed ? null : (
      <SmoothPre
        className="fp-pre"
        code={shown}
        handlers={buildHandlers({
          lineNumbers,
          wordWrap,
          fileStart:
            filePath === null ? undefined : previewing ? fixed.fileStart : fileStart,
          fileNumbers: previewing ? fixed.fileNumbers : fileNumbers,
          // The fix is spliced in, so the boxes' lines no longer name the lines
          // they were written about.
          waypoint: previewing ? undefined : waypoint,
        })}
      />
      )}
    </div>
  )
}

/** What `panelRuns` needs to decide whether two waypoints share a window. */
function panelStepOf(step: PreparedStep): PanelStep {
  return {
    filePath: step.filePath,
    fileStart: step.fileStart,
    proposed: step.proposed,
    value: step.code.code,
  }
}

/**
 * One file's code, carrying every waypoint of that file as a box on its line.
 *
 * The members share a window — `panelRuns` groups them on exactly that — so
 * their annotations live in the same coordinate space and merge without a shift.
 * The diff is the same on every member, so it is taken once; the marks differ
 * per waypoint and are unioned; and each waypoint adds one `waypoint`
 * annotation at the line it is about, which the handler turns into its box.
 * Focus is dropped: a focus dims everything it does not cover, and a panel that
 * belongs to a dozen waypoints has nothing single to focus.
 */
export function mergedWaypointCode(
  members: readonly PreparedStep[],
  stepIndices: readonly number[],
): HighlightedCode {
  const base = members[0]
  if (base === undefined) throw new Error("a panel needs at least one waypoint")
  const diffs = base.code.annotations.filter(
    (annotation) => annotation.name === "diff",
  )
  const marks = members.flatMap((member) =>
    member.code.annotations.filter(
      (annotation) => annotation.name === "mark" || annotation.name === "outline",
    ),
  )
  const boxes = members.map((member, at) => {
    const target = targetLineNumber(member.code) ?? 1
    return {
      name: "waypoint",
      query: "",
      fromLineNumber: target,
      toLineNumber: target,
      data: { stepIndex: stepIndices[at] ?? -1 },
    }
  }) as HighlightedCode["annotations"]
  return { ...base.code, annotations: [...boxes, ...diffs, ...marks] }
}

/**
 * The walkthrough as the code itself, one panel per file.
 *
 * The two-column layout put prose in a column and the code beside it; here the code
 * is the whole of it and each waypoint's prose is a box spliced in above the
 * line it is about. A file is drawn once — every waypoint of it is a box on that
 * one copy — with the file's summary above it and its path left unwritten, since
 * the code says which file it is. Scrolling is the page's own; the reader marks
 * a waypoint as current by clicking its box.
 */
function WalkthroughInline({
  sections: every,
  steps,
  lineNumbers,
  wordWrap,
  filter,
  review,
}: {
  sections: readonly TourSection[]
  steps: readonly PreparedStep[]
  lineNumbers: boolean
  wordWrap: boolean
  filter: ReadonlySet<FilterKey>
  /** The reader's reviewed marks, or null where the page cannot store any. */
  review: ReviewView | null
}) {
  /*
   * Files with nothing left in them go entirely.
   *
   * Hiding the boxes alone would leave a reader who asked for bugs scrolling
   * six files to reach the one that has one — the filter would have narrowed
   * what they read without narrowing what they scroll past.
   *
   * The same predicate the boxes use, so a section can never survive with
   * nothing in it and a box can never be hidden inside a section that was kept
   * for it.
   */
  const sections = useMemo(
    () =>
      every.filter((section) => {
        /*
         * A reviewed file goes whole, unless a link asked for one of its
         * cards. A file whose every card is reviewed is a reviewed file: the
         * API says so, so it is in `files` too.
         */
        if (
          review !== null &&
          !review.showReviewed &&
          review.controls.files.has(section.key) &&
          !section.steps.some((index) => review.revealed.has(index))
        ) {
          return false
        }
        if (filter.size === 0) return true
        return section.steps.some((index) => {
          const one = steps[index]
          return one !== undefined && matchesFilter(one, filter) && !reviewHides(review, one.id, index)
        })
      }),
    [every, steps, filter, review],
  )
  // Which waypoint the reader last clicked, for a quiet highlight. -1 is none.
  const [position, setPosition] = useState(-1)

  // Every waypoint's selection index, flat and in document order.
  const order = useMemo(
    () => sections.flatMap((section) => [...section.steps]),
    [sections],
  )

  const boxes = useMemo(() => {
    const map = new Map<number, WaypointBox>()
    for (const index of order) {
      const step = steps[index]
      if (step === undefined) continue
      map.set(index, {
        stepIndex: index,
        id: step.id,
        title: step.title,
        badge: step.badge,
        prose: step.prose,
        ...(step.needsAttention === undefined
          ? {}
          : { needsAttention: step.needsAttention }),
        ...(step.findings === undefined ? {} : { findings: step.findings }),
      })
    }
    return map
  }, [order, steps])

  const current = position >= 0 ? (order[position] ?? null) : null
  const boxState = useWaypointBoxState({
    boxes,
    filter,
    current,
    onSelect: (stepIndex) => {
      const at = order.indexOf(stepIndex)
      if (at >= 0) setPosition(at)
    },
    review,
  })

  // A tour with nothing in it yet draws nothing under its heading.
  if (every.length === 0) return null
  if (sections.length === 0) {
    return (
      <div className="fp-wt fp-wt-empty">
        <p>No waypoint matches this filter.</p>
      </div>
    )
  }

  return (
    <WaypointBoxProvider state={boxState}>
      <div className="fp-wt">
        {sections.map((section, sectionAt) => {
          const runs = panelRuns(
            section.steps.map((index) => panelStepOf(steps[index] as PreparedStep)),
          )
          return (
            <section
              key={`${section.key}-${String(sectionAt)}`}
              className="fp-wt-file"
              data-reviewed={
                review === null || !section.file ? undefined : review.controls.files.has(section.key)
              }
            >
              {review === null || !section.file ? null : (
                <div className="fp-wt-file-head">
                  <ReviewToggle
                    reviewed={review.controls.files.has(section.key)}
                    label="File reviewed"
                    onToggle={() => {
                      review.controls.onChange({
                        op: review.controls.files.has(section.key) ? "unmark" : "mark",
                        file: section.key,
                      })
                    }}
                  />
                </div>
              )}
              {section.titleHtml === "" ? null : (
                <HostMarkdown
                  className="fp-wt-summary"
                  html={section.titleHtml}
                  collapsible={false}
                />
              )}
              {section.summaryHtml === "" ? null : (
                <HostMarkdown
                  className="fp-wt-summary"
                  html={section.summaryHtml}
                  // Reference prose; folding here would reach the document.
                  collapsible={false}
                />
              )}
              {runs.map((run, runAt) => {
                const stepIndices = run.map(
                  (memberAt) => section.steps[memberAt] ?? -1,
                )
                const members = stepIndices.map(
                  (index) => steps[index] as PreparedStep,
                )
                const base = members[0]
                if (base === undefined) return null
                const anchors = panelAnchorOf(members)
                return (
                  <CodePanel
                    key={runAt}
                    code={mergedWaypointCode(members, stepIndices)}
                    filePath={base.filePath}
                    fileStart={base.fileStart}
                    fileNumbers={base.fileNumbers}
                    proposed={base.proposed}
                    windowed={base.windowed}
                    fileLink={base.fileLink}
                    anchor={anchors.anchor}
                    shifted={anchors.shifted}
                    moved={anchors.moved}
                    annotation={base.annotation}
                    lineNumbers={lineNumbers}
                    wordWrap={wordWrap}
                    waypoint
                    /*
                     * Only on a panel that is one card's.
                     *
                     * A run of waypoints shares one window, and a fix belongs
                     * to exactly one of them — so on a merged panel the button
                     * could not say whose fix it was showing, and the reader
                     * would have no way to tell.
                     */
                    fixed={members.length === 1 ? base.fixed : undefined}
                  />
                )
              })}
            </section>
          )
        })}
      </div>
    </WaypointBoxProvider>
  )
}

/** How far down before "back to top" is worth offering. */
const TO_TOP_AFTER = 240

/**
 * Whichever element is actually scrolling.
 *
 * Resolved on every use rather than captured once, because it changes: above
 * 900px `.fp-scrolly` is the scroller, and below it the media query hands
 * scrolling back to the host's own element and leaves `.fp-scrolly` visible.
 * A reference taken at mount would be the wrong element after a resize across
 * that breakpoint.
 */
function scrollerOf(root: HTMLElement): HTMLElement | null {
  const inner = root.querySelector<HTMLElement>(".fp-scrolly")
  if (inner !== null && inner.scrollHeight > inner.clientHeight + 1) return inner

  const view = root.ownerDocument.defaultView
  for (let node: HTMLElement | null = root; node !== null; node = node.parentElement) {
    if (node.scrollHeight <= node.clientHeight + 1) continue
    const overflow = view?.getComputedStyle(node).overflowY
    if (overflow === "auto" || overflow === "scroll") return node
  }
  const scrolling = root.ownerDocument.scrollingElement
  return scrolling instanceof HTMLElement ? scrolling : null
}

/**
 * Publishes the pinned walkthrough heading's height as `--fp-walkthrough-head`
 * on `.fp-walkthrough`.
 *
 * Each file's header is pinned to the same edge as the heading, so without the
 * offset it parks behind the heading and the path is not there. Measured for
 * the same reason as `--fp-sticky-top`: the height is a line of text plus
 * padding and moves with the editor's font size.
 *
 * A callback ref rather than an effect, because the row mounts after the view
 * is measured and again on every band change, and an effect keyed on a ref
 * object would not see either.
 */
function usePinnedHeight() {
  const observer = useRef<ResizeObserver | null>(null)

  return useCallback((row: HTMLDivElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (row === null) return
    const walkthrough = row.closest<HTMLElement>(".fp-walkthrough")
    if (walkthrough === null) return

    const publish = () => {
      const { height } = row.getBoundingClientRect()
      walkthrough.style.setProperty("--fp-walkthrough-head", `${String(Math.round(height))}px`)
    }

    publish()
    observer.current = new ResizeObserver(publish)
    observer.current.observe(row)
  }, [])
}

/**
 * Takes the reader back to the top of a long walkthrough.
 *
 * Always rendered and faded in, rather than mounted when it becomes relevant:
 * a button that appears mid-scroll under the pointer is a button that gets
 * clicked by accident.
 */
function BackToTopButton({ root }: { root: RefObject<HTMLDivElement | null> }) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const element = root.current
    if (element === null) return
    const doc = element.ownerDocument

    const check = () => {
      const scroller = scrollerOf(element)
      setShown(scroller !== null && scroller.scrollTop > TO_TOP_AFTER)
    }

    /*
     * One listener, in the capture phase.
     *
     * A scroll event does not bubble, so a listener on the root would miss the
     * inner scroller entirely. Capturing at the document sees whichever of the
     * two is scrolling without having to know which one that is, which is the
     * same problem `scrollerOf` exists for.
     */
    doc.addEventListener("scroll", check, true)
    check()
    return () => {
      doc.removeEventListener("scroll", check, true)
    }
  }, [root])

  return (
    <button
      type="button"
      className="fp-to-top"
      title="Scroll back to top"
      aria-label="Scroll back to top"
      data-shown={shown}
      // Not reachable by keyboard while it is faded out, or tabbing through a
      // walkthrough would stop at an invisible control.
      tabIndex={shown ? 0 : -1}
      onClick={() => {
        const element = root.current
        if (element === null) return
        const view = element.ownerDocument.defaultView
        scrollerOf(element)?.scrollTo({
          top: 0,
          // Smooth, unlike the diagram's jumps: this is the browser's own
          // scrolling rather than a library animating a viewport, and seeing
          // the page travel is most of what tells a reader where they went.
          behavior: view?.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }}
    >
      <VscodeIcon name="arrow-up" size={14} />
    </button>
  )
}

/**
 * Puts the reader back on their waypoint after the provider is remounted.
 *
 * The selected waypoint lives in `SelectionProvider`, in a `useState(0)` this
 * code cannot reach, and the provider is remounted on purpose whenever the
 * band changes — Code Hike's `Scroller` ignores a changed `rootMargin`, so a
 * remount is the only way to apply a new one. The remount therefore threw the
 * reader back to waypoint one, and the panel then looked frozen: a fresh
 * observer reports every step it can see as not intersecting, finds nothing to
 * select, and stays at one until a step boundary next crosses the band. Deep
 * inside a long waypoint that is a screenful of scrolling with no response.
 *
 * So the number is kept outside, in a ref the remount cannot touch, and put
 * back on the way in. Renders nothing: it exists to be inside the provider,
 * which is the only place `useSelectedIndex` works.
 */
function SelectionMemory({
  remembered,
  count,
}: {
  remembered: MutableRefObject<number>
  count: number
}) {
  const [index, select] = useSelectedIndex()
  const restoring = useRef<number | null>(null)
  const restored = useRef(false)

  useLayoutEffect(() => {
    // Before paint, so waypoint one is never shown on the way past.
    if (restored.current) return
    restored.current = true
    const wanted = restorableIndex(remembered.current, count)
    if (wanted === null) return
    restoring.current = wanted
    select(wanted)
  }, [count, remembered, select])

  useEffect(() => {
    /*
     * Nothing is recorded until the restore has landed.
     *
     * The provider still reports zero for the render that asks it to move, and
     * recording that would erase the number this exists to keep — the reader
     * would be put back on waypoint one by the very thing meant to prevent it.
     */
    if (restoring.current !== null) {
      if (index !== restoring.current) return
      restoring.current = null
    }
    remembered.current = index
  }, [index, remembered])

  return null
}

/**
 * Makes `[Title](#slug)` links in prose go to their waypoint.
 *
 * One delegated listener on the root instead of a handler per link: the links
 * are written into the DOM as rendered prose, so React never sees them and has
 * nothing to attach to. Preventing the default keeps a fragment out of the
 * webview's URL; nothing on the page has the slug as an `id` anyway.
 */
function WaypointLinks({
  slugs,
  root,
  onReveal,
}: {
  slugs: readonly string[]
  root: RefObject<HTMLDivElement | null>
  /** Draws a card that is hidden because it is reviewed. */
  onReveal: (index: number) => void
}) {
  useEffect(() => {
    const element = root.current
    if (element === null) return

    const onActivate = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      const href = target.closest("a[href]")?.getAttribute("href")
      if (href === null || href === undefined || !href.startsWith("#")) return

      const index = slugs.indexOf(href.slice(1))
      // An anchor pointing at something else on the page is left alone.
      if (index < 0) return
      event.preventDefault()
      // So the click does not also reach whatever the link sits in.
      event.stopPropagation()
      /*
       * To the waypoint's box, opened.
       *
       * A slug's index is the waypoint's step index, which is what each box
       * carries as `data-fp-wp-step`. This used to select the Code Hike
       * selection with it — which holds the diagram's node panels, not
       * waypoints — and scroll to an attribute nothing wrote, so the click
       * lit up an unrelated node and went nowhere. A box a filter hides is
       * not drawn, and the click then does nothing.
       */
      const go = (): boolean => {
        const box = element.querySelector<HTMLElement>(`[data-fp-wp-step="${String(index)}"]`)
        if (box === null) return false
        if (box.dataset["open"] !== "true") {
          box.querySelector<HTMLElement>(".fp-wp-box-head")?.click()
        }
        box.scrollIntoView({ block: "center", behavior: "auto" })
        return true
      }
      if (go()) return
      /*
       * Not drawn: reviewed, and hidden. The link shows it again, and the
       * box exists once React has drawn it. A timeout rather than an animation
       * frame, which a hidden page never runs.
       */
      onReveal(index)
      setTimeout(() => {
        go()
      }, 0)
    }

    element.addEventListener("click", onActivate)
    return () => {
      element.removeEventListener("click", onActivate)
    }
  }, [root, slugs, onReveal])

  return null
}

export function Scrollycoding({
  layout,
  review: reviewControls,
  codeLinks,
  planRef,
  toolHint,
  qualify,
  lineNumbers,
  wordWrap,
  nodePanels,
}: ScrollycodingProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const pinnedRef = usePinnedHeight()
  // For a code link's click, which opens the file when the host can.
  const host = useHost()

  /*
   * The selected node panel, kept where a remount of the provider cannot reach.
   *
   * Reset when the document changes, during render rather than in an effect:
   * an effect would run after the new provider had already mounted and been
   * restored, so the reader would land on a stale node. A different document is
   * a different diagram.
   */
  const remembered = useRef(0)
  const lastRef = useRef(planRef)
  if (lastRef.current !== planRef) {
    lastRef.current = planRef
    remembered.current = 0
  }

  const metrics = usePaneMetrics(rootRef)
  const band = metrics?.band ?? null
  const steps = layout.steps
  // Titles in document order, for the `#slug` each waypoint answers to.
  const waypointTitles = useMemo(() => steps.map((step) => step.title), [steps])

  /*
   * One slug per waypoint, computed here and handed both ways.
   *
   * The heading's `id` and the link's target have to be the same string, and
   * two waypoints may share a title — "The guard" in two sections is
   * ordinary — so the disambiguating suffix has to be decided once, over the
   * whole list. Deriving it separately in each place gave the second heading
   * the first one's id, which is invalid HTML and quietly breaks the anchor.
   */
  const slugs = useMemo(() => waypointSlugs(waypointTitles), [waypointTitles])

  /*
   * Where each node's panel sits in the selection.
   *
   * The `Selection` now carries only node panels — the walkthrough moved to its
   * own inline boxes and no longer shares this space — so a node's index is its
   * plain position, no waypoint offset. A click on a node selects it and the
   * diagram's own full screen reveals the panel; nothing else drives it.
   */
  const panels = useMemo(
    () => new Map((nodePanels ?? []).map((panel, at) => [panel.id, at])),
    [nodePanels],
  )

  /*
   * Three regions, because only the middle one is about code.
   *
   * The split used to run the whole width of the panel from top to bottom, so
   * an overview paragraph and a diagram were laid out in a half-width column
   * with an unrelated code panel beside them. The diagram is the worst case: it
   * is the one block that wants every pixel available and it was given the
   * fewest.
   *
   * Everything from the first waypoint to the last stays in the split,
   * interludes between waypoints included. Those belong to the scroll
   * narrative — a heading that groups the waypoints under it — and lifting them
   * out would break the run of code beside them in two.
   */
  /*
   * Which finding each waypoint belongs to, so its border can say so.
   *
   * Computed here rather than passed in, because the answer is about one
   * waypoint's relationship to another and this is the only component holding
   * all of them. A finding's own cards carry no badge — a second chip would
   * read as a second finding — so without this the group's border changed
   * colour at every card and the finding's own border looked severed.
   */
  /*
   * What the reader narrowed the tour to. Empty is everything.
   *
   * Held here rather than inside the tour because the button that sets it sits
   * on the walkthrough's own heading, which is a band above the tour — and both
   * have to agree about what is showing.
   */
  const [filter, setFilter] = useState<ReadonlySet<FilterKey>>(new Set())

  /*
   * Reviewed items, hidden unless the reader asks to see them.
   *
   * `revealed` holds cards a `#slug` link asked for: a link to a reviewed card
   * shows that card again rather than going nowhere. It is cleared by nothing
   * but a new document; a reader who hid
   * reviewed items again has already seen them.
   */
  const [showReviewed, setShowReviewed] = useState(false)
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(new Set())
  const review = useMemo<ReviewView | null>(
    () => (reviewControls === undefined ? null : { controls: reviewControls, showReviewed, revealed }),
    [reviewControls, showReviewed, revealed],
  )
  const reveal = useCallback((index: number) => {
    setRevealed((previous) => (previous.has(index) ? previous : new Set([...previous, index])))
  }, [])
  // How many cards the reviewed marks hide, for the switch's label.
  const hiddenCount = useMemo(
    () =>
      reviewControls === undefined
        ? 0
        : steps.filter((step) => reviewControls.waypoints.has(step.id)).length,
    [reviewControls, steps],
  )

  /** How many waypoints each key would keep, so a filter can be read before it is set. */
  const filterCounts = useMemo(() => {
    const tally = Object.fromEntries(FILTER_KEYS.map((key) => [key, 0])) as Record<
      FilterKey,
      number
    >
    for (const step of steps) {
      if (step.needsAttention !== undefined) tally.attention += 1
      // A document-level finding counts as its own kind: the card is the finding.
      if (step.badge !== null) tally[step.badge] += 1
      for (const found of step.findings ?? []) tally[found.kind] += 1
    }
    return tally
  }, [steps])

  const renderBlock = (block: PreparedBlock, blockIndex: number) =>
    block.kind === "blast" ? (
      /*
       * A band of its own, like the diagram, and for the same reason: it is a
       * map rather than a step, so it belongs beside the tour rather than inside
       * a waypoint where it would compete with the code panel.
       */
      <div
        key={blockIndex}
        className="fp-interlude"
        data-fp-block-level={block.level}
      >
        {block.blast === null ? null : <BlastGraph blast={block.blast} />}
      </div>
    ) : block.kind === "diagram" ? (
      // Inside the provider, which is what makes the binding possible: it
      // reads and writes the selected waypoint. That holds in a full-width
      // band as much as in the column, because the provider wraps both.
      <div
        key={blockIndex}
        className="fp-interlude"
        data-fp-block-level={block.level}
      >
        <Diagram
          diagram={block.diagram}
          problems={block.problems}
          excerpts={block.excerpts}
          panels={panels}
        />
      </div>
    ) : (
      <HostMarkdown
        key={blockIndex}
        className={
          blockIndex === 0 ? "fp-interlude fp-interlude-lead" : "fp-interlude"
        }
        html={block.html}
        blockLevel={block.level}
      />
    )

  return (
    <div
      className="fp-root"
      ref={rootRef}
      style={
        metrics === null
          ? undefined
          : ({ "--fp-view-height": `${metrics.viewHeight}px` } as CSSProperties)
      }
    >
      {/*
        Nothing renders until the view has been measured, and that is not a
        nicety. Code Hike's Scroller falls back to a default rootMargin computed
        from the window height, and at height 0 that produces the string
        "--2px 0px --2px", which IntersectionObserver rejects and which throws
        out of render. A view laid out before it is sized is normal in an iframe
        or a webview, so the default path must never run.

        Once measured, the observer is only rebuilt when Scroller's own effect
        re-runs, and its dependency list does not include rootMargin. Keying on
        the band forces a remount when the view geometry changes, which is the
        only way to apply a new band. The quantised band keeps remounts rare.
      */}
      {band === null ? null : (
      <SelectionProvider
        key={`${band.top}:${band.height}`}
        rootMargin={band}
        className="fp-scrolly"
      >
        <SelectionMemory remembered={remembered} count={nodePanels?.length ?? 0} />
        <WaypointLinks slugs={slugs} root={rootRef} onReveal={reveal} />
        <CodeLinks
          excerpts={codeLinks ?? EMPTY_CODE_LINKS}
          root={rootRef}
          onOpen={host.openFile}
        />
        {layout.lead.length === 0 ? null : (
          <div className="fp-band">
            {layout.lead.map((block, index) => renderBlock(block, index))}
          </div>
        )}
        {layout.intro.length === 0 && layout.sections.length === 0 ? null : (
          /*
           * The walkthrough, now the code itself.
           *
           * The intro band — the walkthrough's own heading and the sentence
           * under it — stays a plain band; the two-column reading layout and its
           * bar are gone, and `WalkthroughInline` draws each file once with its
           * waypoints as boxes spliced into the code.
           */
          <div className="fp-walkthrough">
            {layout.intro.length === 0 ? null : (
              /*
               * The filter sits on the walkthrough's own heading.
               *
               * Beside the band rather than inside it: the heading is Markdown
               * the host renders, so there is nowhere in it to put a control.
               * The band is given the position instead, and the button is laid
               * against its first line.
               *
               * The row is pinned while the files scroll under it, so it holds
               * the heading alone; the note under the heading scrolls away.
               */
              <div ref={pinnedRef} className="fp-band fp-band-headed">
                <div className="fp-band-blocks">
                  {layout.intro.slice(0, 1).map((block, index) =>
                    renderBlock(block, layout.lead.length + index),
                  )}
                </div>
                <div className="fp-band-actions">
                  {review === null ? null : (
                    <button
                      type="button"
                      className="fp-filter-button fp-review-show"
                      aria-pressed={showReviewed}
                      data-active={showReviewed}
                      onClick={() => {
                        setShowReviewed((was) => !was)
                      }}
                    >
                      {showReviewed ? "Hide reviewed" : `Show reviewed (${String(hiddenCount)})`}
                    </button>
                  )}
                  <FilterMenu
                    filter={filter}
                    onChange={setFilter}
                    counts={filterCounts}
                  />
                </div>
              </div>
            )}
            {layout.intro.length <= 1 ? null : (
              <div className="fp-walkthrough-note">
                {layout.intro.slice(1).map((block, index) =>
                  renderBlock(block, layout.lead.length + 1 + index),
                )}
              </div>
            )}
            <WalkthroughInline
              sections={layout.sections}
              steps={steps}
              lineNumbers={lineNumbers}
              wordWrap={wordWrap}
              filter={filter}
              review={review}
            />
          </div>
        )}
        {/*
          The diagram's node code panel, and nothing else now — the walkthrough
          left this column. Hidden until the diagram's own full screen reveals
          it (see the `data-fp-diagram-code` rule), which is the only thing that
          drives the selection any more.

          Deliberately no `key` on the panels: `Selection` renders one at a
          single tree position, so without keys React updates it in place, which
          is what lets SmoothPre animate between nodes rather than remount.
        */}
        {nodePanels === undefined || nodePanels.length === 0 ? null : (
          <div className="fp-code-column fp-code-column-node">
            <div className="fp-code-frame">
              <Selection
                from={nodePanels.map((panel) => (
                  <CodePanel
                    heading={{
                      label: panel.label,
                      sublabel: panel.sublabel,
                      description: panel.description,
                      annotation: panel.annotation,
                      source: panel.source,
                    }}
                    annotation={panel.annotation}
                    code={panel.code}
                    filePath={panel.filePath}
                    fileStart={panel.fileStart}
                    fileNumbers={panel.fileNumbers}
                    windowed={panel.windowed}
                    fileLink={panel.fileLink}
                    anchor={panel.anchor}
                    shifted={panel.shifted}
                    lineNumbers={lineNumbers}
                    wordWrap={wordWrap}
                  />
                ))}
              />
            </div>
          </div>
        )}

      </SelectionProvider>
      )}
      <SelectionReference
        hostRef={rootRef}
        subject={planRef}
        toolHint={toolHint}
        qualify={qualify}
      />
      {/*
        Outside the provider, because it needs no selection — and after it, so
        it paints above the bands without needing a z-index of its own to beat
        them.
      */}
      <BackToTopButton root={rootRef} />
    </div>
  )
}
