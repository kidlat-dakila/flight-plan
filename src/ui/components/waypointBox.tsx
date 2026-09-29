import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { AnnotationHandler } from "codehike/code"
import { HostMarkdown } from "./HostMarkdown"
import { renderInline } from "../markdown"
import { itemizeWaypointLabels } from "../prose"
import type { FindingKind } from "../../lib/schemas/document/schema"
import type { Prose } from "../document/view"
import { highestKind } from "../../lib/schemas/document/schema"
import type { WaypointFinding } from "../../lib/schemas/document/schema"

/**
 * A waypoint's prose, drawn as a box spliced into the code above its lines.
 *
 * The two-column layout put the prose in a column beside the code; the
 * walkthrough is now the code itself, so a waypoint's explanation lives on top of the line it is
 * about. Collapsed it is a title and a way in; expanded it is the prose. The box
 * is an ordinary block in the code flow — it pushes the lines below it down
 * rather than floating over them, so two waypoints near each other never
 * overlap.
 */

/**
 * What a reader can narrow the tour to.
 *
 * The four finding kinds plus the attention flag, which is not a finding and
 * has no kind — it is the agent saying "slow down here" rather than "this is
 * wrong", so it filters as its own thing rather than as a fifth severity.
 */
export type FilterKey = FindingKind | "attention"

export const FILTER_KEYS: readonly FilterKey[] = [
  "attention",
  "bug",
  "risk",
  "nit",
  "question",
]

/** How each key reads in the menu. */
export const FILTER_LABELS: Record<FilterKey, string> = {
  attention: "Needs Attention",
  bug: "Bug",
  risk: "Risk",
  nit: "Nit",
  question: "Question",
}

/**
 * Whether a waypoint survives the filter.
 *
 * An empty filter shows everything, which is what makes "nothing ticked" the
 * off state rather than a state that hides the whole tour. Several ticked is an
 * `any` match: a reader asking for bugs and risks wants both lists at once, not
 * the waypoints that are somehow both.
 *
 * One predicate, exported, because two callers ask this question — the box, to
 * decide whether to draw itself, and the tour, to decide whether a file has
 * anything left in it. Two implementations would drift into a file that renders
 * with no boxes in it.
 */
export function matchesFilter(
  step: {
    needsAttention?: string
    findings?: readonly { kind: FindingKind }[]
    /** A document-level finding's kind: the card is the finding. */
    badge?: FindingKind | null
  },
  filter: ReadonlySet<FilterKey>,
): boolean {
  if (filter.size === 0) return true
  if (filter.has("attention") && step.needsAttention !== undefined) return true
  if (step.badge != null && filter.has(step.badge)) return true
  return (step.findings ?? []).some((one) => filter.has(one.kind))
}

/** What one box needs to draw itself. */
export type WaypointBox = {
  stepIndex: number
  /** The waypoint's id: a copied reference to its prose names it. */
  id: string
  title: string
  /** A document-level finding's kind, for its chip. See `ViewStep`. */
  badge: FindingKind | null
  /** The reading, as Markdown, or HTML built around it. */
  prose: Prose
  /** Why a reviewer must not skim this one. See `PreparedStep`. */
  needsAttention?: string
  /** What is wrong with this code. See `PreparedStep`. */
  findings?: readonly WaypointFinding[]
}

/**
 * The reader's reviewed marks, and how to change them. The state is the API's
 * (`reviewedState`): ids and paths already
 * worked out — a parent covers its children, a file with every card
 * reviewed is reviewed, a changed item is not.
 */
export type ReviewControls = {
  waypoints: ReadonlySet<string>
  files: ReadonlySet<string>
  onChange: (change: { op: "mark" | "unmark"; waypoint: string } | { op: "mark" | "unmark"; file: string }) => void
}

/** How the tour treats reviewed items right now. */
export type ReviewView = {
  controls: ReviewControls
  /** Whether reviewed items are drawn (marked as such) rather than hidden. */
  showReviewed: boolean
  /** Cards a link asked for, drawn even though they are reviewed. */
  revealed: ReadonlySet<number>
}

/** Whether a card is hidden because it is reviewed. */
export function reviewHides(view: ReviewView | null, id: string, stepIndex: number): boolean {
  return view !== null && !view.showReviewed && view.controls.waypoints.has(id) && !view.revealed.has(stepIndex)
}

type BoxState = {
  boxes: ReadonlyMap<number, WaypointBox>
  review: ReviewView | null
  /** What the reader narrowed the tour to. Empty is everything. */
  filter: ReadonlySet<FilterKey>
  expanded: ReadonlySet<number>
  toggle: (stepIndex: number) => void
  /** The waypoint the nav is on, for a quiet highlight. Null before the first. */
  current: number | null
  onSelect: (stepIndex: number) => void
}

const WaypointBoxContext = createContext<BoxState | null>(null)

/**
 * Holds every box's expand state and the nav's current waypoint.
 *
 * One provider around the whole walkthrough rather than one per panel: expanding
 * a box is a per-waypoint fact, but the set lives in one place so the handler —
 * rendered deep inside Code Hike's `Pre` — can read it without threading props
 * through the highlighter.
 */
export function useWaypointBoxState(options: {
  boxes: ReadonlyMap<number, WaypointBox>
  filter: ReadonlySet<FilterKey>
  current: number | null
  onSelect: (stepIndex: number) => void
  review: ReviewView | null
}): BoxState {
  const { boxes, filter, current, onSelect, review } = options
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set())

  const toggle = useCallback((stepIndex: number) => {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(stepIndex)) next.delete(stepIndex)
      else next.add(stepIndex)
      return next
    })
  }, [])

  return useMemo(
    () => ({ boxes, filter, expanded, toggle, current, onSelect, review }),
    [boxes, filter, expanded, toggle, current, onSelect, review],
  )
}

export function WaypointBoxProvider({
  state,
  children,
}: {
  state: BoxState
  children: ReactNode
}) {
  return (
    <WaypointBoxContext.Provider value={state}>
      {children}
    </WaypointBoxContext.Provider>
  )
}

/**
 * `waypoint` — a box drawn above the line the annotation names.
 *
 * The annotation is added to the code, not written in it: one per waypoint at
 * its target line, carrying the `stepIndex` that keys the box's content and its
 * expand state. Rendered as a Block so it sits in the line flow; `children` is
 * the target line itself, drawn after the box so the box is above it.
 */
export const waypointHandler: AnnotationHandler = {
  name: "waypoint",
  onlyIfAnnotated: true,
  Block: ({ annotation, children }) => {
    const state = useContext(WaypointBoxContext)
    const data = (annotation.data ?? {}) as { stepIndex?: number }
    const stepIndex = typeof data.stepIndex === "number" ? data.stepIndex : -1
    const box = state?.boxes.get(stepIndex)
    if (state === null || box === undefined) return <>{children}</>
    /*
     * Filtered out: the line renders, the box does not.
     *
     * The tour is the file, so narrowing it can only hide what was said *about*
     * the code — hiding the code itself would leave a walkthrough that walks
     * nothing. A file with no box left is dropped a level up, where the whole
     * section can go rather than leaving an unexplained panel behind.
     */
    if (!matchesFilter(box, state.filter)) return <>{children}</>
    // Reviewed and hidden: the same as filtered out — the code stays, the box goes.
    if (reviewHides(state.review, box.id, stepIndex)) return <>{children}</>
    const reviewed = state.review?.controls.waypoints.has(box.id) === true

    const open = state.expanded.has(stepIndex)
    const kind = highestKind(box.findings ?? [])
    const label = box.title === "" ? `Waypoint ${String(stepIndex + 1)}` : box.title

    const head = (
      <button
        type="button"
        className="fp-wp-box-head"
        aria-expanded={open}
        onClick={() => {
          state.onSelect(stepIndex)
          state.toggle(stepIndex)
        }}
      >
        {box.badge === null ? null : (
          <span className="fp-step-badge" data-kind={box.badge}>
            {box.badge}
          </span>
        )}
        {/*
          The chip is on the head, which is the part that is always drawn.
          A flag only visible once the card is open would be a flag nobody
          looking for it can find.
        */}
        {/*
          One chip however many findings, showing the highest kind: a card
          with a bug and a nit says bug, because the bug is why anybody
          would stop. The list inside says how many.
        */}
        {kind === null ? null : (
          <span className="fp-step-badge" data-kind={kind}>
            {kind}
          </span>
        )}
        {box.needsAttention === undefined ? null : (
          <span className="fp-step-flag">Needs Attention</span>
        )}
        <span className="fp-wp-box-title">{label}</span>
        <span className="fp-wp-box-expand" aria-hidden="true">
          {open ? "Collapse" : "Expand"}
        </span>
      </button>
    )

    return (
      <>
        <div
          className="fp-wp-box"
          data-open={open}
          data-current={state.current === stepIndex}
          data-fp-wp-step={stepIndex}
          data-reviewed={state.review === null ? undefined : reviewed}
        >
          {/*
            The reviewed control beside the head, not in it: the head is a
            button, and a button cannot hold another. Only where the page can
            store a mark; the webview gets it with the API.
          */}
          {state.review === null ? head : (
            <div className="fp-wp-box-bar">
              {head}
              <ReviewToggle
                reviewed={reviewed}
                label="Reviewed"
                onToggle={() => {
                  state.review?.controls.onChange({ op: reviewed ? "unmark" : "mark", waypoint: box.id })
                }}
              />
            </div>
          )}
          {open ? (
            <div className="fp-wp-box-body">
              <HostMarkdown
                className="fp-wp-box-prose"
                {...("markdown" in box.prose
                  ? { markdown: itemizeWaypointLabels(box.prose.markdown) }
                  : { html: box.prose.html })}
                node={box.id}
                // Reference prose: folding here would reach the document under it.
                collapsible={false}
              />
              {box.needsAttention === undefined ? null : (
                /*
                 * Under the reading, not over it.
                 *
                 * The chip on the head is what says "there is something here"
                 * before anything is opened, so the callout does not also have
                 * to interrupt: a reader who opens the card wants the reading
                 * first, and a wall of warning above it buries the explanation
                 * they opened it for.
                 *
                 * Through the Markdown renderer so a `code:` link in the
                 * reasoning still resolves and shows its excerpt on hover.
                 */
                <div className="fp-wp-box-flag">
                  <div className="fp-wp-box-flag-head">Needs Attention</div>
                  <HostMarkdown
                    className="fp-wp-box-flag-prose"
                    markdown={box.needsAttention}
                    node={box.id}
                    collapsible={false}
                  />
                </div>
              )}
              {(box.findings ?? []).map((found) => (
                /*
                 * Under the reading, beside the attention flag, for the same
                 * reason. Each carries its own chip, because the one on the
                 * head collapsed them all to the highest.
                 */
                <div className="fp-wp-box-finding" key={found.id} data-kind={found.kind}>
                  <div className="fp-wp-box-finding-head">
                    <span className="fp-step-badge" data-kind={found.kind}>
                      {found.kind}
                    </span>
                    {found.title}
                  </div>
                  <HostMarkdown
                    className="fp-wp-box-finding-prose"
                    markdown={found.reading}
                    node={box.id}
                    collapsible={false}
                  />
                  {found.trace === undefined ? null : (
                    <HostMarkdown
                      className="fp-wp-box-finding-trace"
                      html={`<ol>\n${found.trace.map((step) => `<li>${renderInline(step)}</li>\n`).join("")}</ol>\n`}
                      node={box.id}
                      collapsible={false}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {children}
      </>
    )
  },
}

/**
 * Marks a waypoint or a file as reviewed, or undoes the mark.
 *
 * A toggle with its state in `aria-pressed`: pressed is reviewed. The same
 * button undoes it, which is where a reader who shows reviewed items again
 * looks for the undo.
 */
export function ReviewToggle({
  reviewed,
  label,
  onToggle,
}: {
  reviewed: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className="fp-review-toggle"
      aria-pressed={reviewed}
      title={reviewed ? "Reviewed. Click to mark it as not reviewed." : "Mark as reviewed. It is hidden until it changes."}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
    >
      <span className="fp-review-check" aria-hidden="true">
        {reviewed ? "\u2713" : ""}
      </span>
      {label}
    </button>
  )
}
