import {
  InnerLine,
  InnerPre,
  InnerToken,
  type AnnotationHandler,
  type InlineAnnotation,
} from "codehike/code"
import type { CSSProperties } from "react"
import type { FindingKind } from "../parse/anchor"
import { waypointHandler } from "./waypointBox"

/**
 * Code Hike annotation handlers.
 *
 * Code Hike parses the `// !name` comments and hands over the positions; the
 * appearance is entirely up to the host. These use CSS classes so the colors
 * come from renderer.css and therefore follow the editor theme.
 */

/*
 * What a plain waypoint's marks are drawn in.
 *
 * Blue, and stated rather than taken from the accent. `--fp-accent` is
 * `--vscode-focusBorder`, which a theme is free to make any colour it likes —
 * so the lines a waypoint is about came out a different colour per theme, and
 * on a green-accented one they were hard to tell from the diff band underneath
 * them, which is green by its own right.
 *
 * The same token the selected waypoint's rail and title use, so the three are
 * one cue: the card you are reading, its heading, and the lines it is about all
 * say the same thing in the same colour.
 *
 * Two fallbacks deep on purpose. An undefined custom property invalidates the
 * whole declaration rather than falling back to an inherited value, so a mark
 * rendered outside `.fp-root` — where `--fp-step-accent` is defined — would
 * otherwise have no colour at all rather than the wrong one.
 */
const DEFAULT_MARK_COLOR = "var(--fp-step-accent, var(--fp-blue, #3794ff))"

/**
 * The colour a finding's marks are drawn in, by kind.
 *
 * The same four colours as the badge on its title, so the chip and the
 * highlighted lines are one cue rather than two: a reviewer who has read the
 * red chip does not have to work out whether the yellow lines below belong to
 * it.
 *
 * Tokens rather than literals, resolved by whichever host stylesheet is loaded.
 * Nothing outside a finding gets one, and the accent is what a walkthrough's
 * marks have always used.
 */
const MARK_COLORS: Record<FindingKind, string> = {
  bug: "var(--fp-red)",
  risk: "var(--fp-yellow)",
  nit: "var(--fp-green)",
  question: "var(--fp-blue)",
}

/** The mark colour for a waypoint of this kind, or none for a plain waypoint. */
export function markColorFor(kind: FindingKind | null): string | undefined {
  return kind === null ? undefined : MARK_COLORS[kind]
}

function markStyle(query: string | undefined): CSSProperties {
  return { "--fp-mark-color": query || DEFAULT_MARK_COLOR } as CSSProperties
}

/**
 * `// !mark`, `// !mark(1:3)`, or `// !mark[/word/]` for part of a line.
 *
 * The wrapper carries the fact and the colour and draws nothing: it is
 * `display: contents`, so the row it wraps is the gutter's row, which is the
 * one element every line has. Rendering a row here as well gave every line two
 * nested ones — two left borders, two flex contexts — and made "which row is
 * the line" a question with two answers.
 */
export const mark: AnnotationHandler = {
  name: "mark",
  onlyIfAnnotated: true,
  Line: ({ annotation, ...props }) => (
    <div
      className="fp-line-mark"
      data-fp-marked={annotation ? "true" : undefined}
      style={annotation ? markStyle(annotation.query) : undefined}
    >
      <InnerLine merge={props} />
    </div>
  ),
  Inline: ({ annotation, children }) => (
    <span className="fp-inline-mark" style={markStyle(annotation?.query)}>
      {children}
    </span>
  ),
}

/**
 * The blocks a parent waypoint breaks into, drawn on the parent.
 *
 * Same carrier as a mark and same colour, told apart by the attribute so the
 * stylesheet can draw it quieter: a parent is the outline of its children, and
 * a band as loud as theirs would compete with the child that narrows it. The
 * ranges are derived rather than authored — see `outlineMarks`.
 */
export const outline: AnnotationHandler = {
  name: "outline",
  onlyIfAnnotated: true,
  Line: ({ annotation, ...props }) => (
    <div
      className="fp-line-mark"
      data-fp-marked={annotation ? "outline" : undefined}
      style={annotation ? markStyle(annotation.query) : undefined}
    >
      <InnerLine merge={props} />
    </div>
  ),
}

/**
 * `// !diff +` and `// !diff -`, shown as a gutter sign plus a tinted line.
 *
 * The tint is an attribute the stylesheet reads, not a second `mark`
 * annotation. Turning a diff into a mark was how this used to work, and on a
 * pull request it destroyed the thing it shared a channel with: a line that was
 * both added and marked by the author carried two `mark` annotations, only one
 * of them reached the row, and it was always the diff's green. Every mark
 * over changed code — which is most of them, in a walkthrough — silently became
 * invisible. Two facts about one line need two channels, and which of them wins
 * the background is then a decision the stylesheet makes in the open.
 */
export const diff: AnnotationHandler = {
  name: "diff",
  onlyIfAnnotated: true,
  Line: ({ annotation, ...props }) => (
    <>
      <span className="fp-diff-sign" aria-hidden="true">
        {annotation?.query ?? " "}
      </span>
      <InnerLine
        merge={props}
        data-fp-diff={
          annotation === undefined ? undefined : annotation.query === "-" ? "del" : "add"
        }
      />
    </>
  ),
}

/** `// !focus(1:4)`, which dims every line the annotation does not cover. */
export const focus: AnnotationHandler = {
  name: "focus",
  onlyIfAnnotated: true,
  // `InnerPre`, not a raw `<pre>`: a raw element ends the Pre chain, so any
  // later handler's Pre is skipped, `_stack` and `_ref` get spread onto the DOM,
  // and the ref SmoothPre needs for its transitions never attaches.
  PreWithRef: (props) => <InnerPre merge={props} data-fp-has-focus="true" />,
  Line: ({ annotation, ...props }) => (
    <InnerLine merge={props} data-fp-focused={annotation ? "true" : "false"} />
  ),
}

type CalloutData = { column: number }

function calloutColumn(data: unknown): number {
  return typeof data === "object" && data !== null && "column" in data
    ? Number((data as CalloutData).column) || 0
    : 0
}

/** `// !callout[/query/] message`, drawn as a bubble under the target line. */
export const callout: AnnotationHandler = {
  name: "callout",
  transform: (annotation: InlineAnnotation) => {
    const { name, query, lineNumber, fromColumn, toColumn } = annotation
    // `data` is typed as `any` upstream, so it is narrowed before being reused.
    const data = (annotation.data ?? {}) as Record<string, unknown>
    return {
      name,
      query,
      fromLineNumber: lineNumber,
      toLineNumber: lineNumber,
      data: { ...data, column: (fromColumn + toColumn) / 2 },
    }
  },
  Block: ({ annotation, children }) => {
    const column = calloutColumn(annotation.data)
    return (
      <>
        {children}
        <div
          className="fp-callout"
          style={{ minWidth: `${column + 4}ch` }}
          role="note"
        >
          <span className="fp-callout-arrow" style={{ left: `${column}ch` }} />
          {annotation.query}
        </div>
      </>
    )
  },
}

/**
 * Always-on gutter with line numbers.
 *
 * `startLine` is the file line the block's first rendered line came from. It
 * exists because referenced code is a window onto a file: numbering that window
 * from 1 would contradict the `#L57-70` in the fence, the editor, and GitHub,
 * which is exactly the confusion the reference format is meant to remove.
 */
function lineNumbersHandler(
  startLine = 1,
  /**
   * Explicit file line per rendered line, for code that is not a plain window.
   *
   * A proposal is spliced into the file, so its rendered lines are not one
   * contiguous run of file lines: the proposed lines have no file line at all,
   * and the lines after them still carry the numbers they have today rather
   * than the ones they would have once the change lands. A null renders blank:
   * the diff column beside it already says the line is being added, and a `+`
   * in both places is one sign too many.
   */
  numbers?: readonly (number | null)[],
): AnnotationHandler {
  return {
    name: "line-numbers",
    Line: (props) => {
      const explicit = numbers?.[props.lineNumber - 1]
      const number =
        numbers === undefined ? startLine + props.lineNumber - 1 : explicit
      const widest =
        numbers === undefined
          ? startLine + props.totalLines - 1
          : (numbers.reduce<number>((most, line) => Math.max(most, line ?? 0), 0) ||
            props.totalLines)
      return (
        /*
         * The one row every line has, and the only one.
         *
         * `mark` used to render a second wrapper with this same class, so every
         * line carried two nested rows. It now carries the mark as an attribute
         * instead and this stays the row, which is what the number, the diff
         * sign and the code are laid out in.
         */
        <div className="fp-line-row">
          <span
            className={
              number === null || number === undefined
                ? "fp-line-number fp-line-number-proposed"
                : "fp-line-number"
            }
            aria-hidden="true"
            style={{ minWidth: `${widest.toString().length}ch` }}
          >
            {number ?? ""}
          </span>
          <InnerLine merge={props} />
        </div>
      )
    },
  }
}

/** The gutter for code that starts at line 1. */
export const lineNumbers: AnnotationHandler = lineNumbersHandler()

/**
 * Wraps long lines instead of scrolling them sideways.
 *
 * Straight from Code Hike's word-wrap recipe. A plain `pre-wrap` would restart
 * continuation lines at column zero; the negative text indent plus the matching
 * left margin keeps them aligned with the line's own indentation.
 */
export const wordWrap: AnnotationHandler = {
  name: "word-wrap",
  Pre: (props) => <InnerPre merge={props} className="fp-pre-wrap" />,
  Line: (props) => (
    <InnerLine merge={props}>
      <div
        style={{
          textIndent: `${-props.indentation}ch`,
          marginLeft: `${props.indentation}ch`,
        }}
      >
        {props.children}
      </div>
    </InnerLine>
  ),
  Token: (props) => <InnerToken merge={props} style={{ textIndent: 0 }} />,
}

/**
 * Tags every line and carries the shared line class.
 *
 * Jobs that all need a handler that always runs. `data-fp-line` is how the
 * code panel finds the line to scroll to when a step is selected.
 * `data-fp-file-line` is the file line, which a text selection turns into a
 * reference. The class carries the horizontal
 * padding, which would otherwise be missing on a block with no annotations and
 * no line numbers, since every other Line handler here is either
 * annotation-gated or off by default.
 */
function lineMetaHandler(options: {
  /** File line of the first rendered line, for referenced code. */
  fileStart?: number
  /** Explicit file line per rendered line, for spliced code. */
  fileNumbers?: readonly (number | null)[]
}): AnnotationHandler {
  const { fileStart, fileNumbers } = options
  return {
    name: "line-meta",
    Line: (props) => (
      <InnerLine
        merge={props}
        className="fp-line"
        data-fp-line={props.lineNumber}
        data-fp-file-line={
          fileNumbers !== undefined
            ? // A proposed line has no file line, so it gets no attribute and a
              // selection over it copies no range. Better than a range that
              // points at whatever occupies that number today.
              (fileNumbers[props.lineNumber - 1] ?? undefined)
            : fileStart === undefined
              ? undefined
              : fileStart + props.lineNumber - 1
        }
      />
    ),
  }
}

/**
 * Builds the handler list. Order decides nesting: the first handler with a
 * `Line` becomes the outermost wrapper, so `mark` sits outside the line-number
 * gutter and its highlight covers the number too.
 */
export function buildHandlers(options: {
  lineNumbers: boolean
  wordWrap: boolean
  /** File line of the first rendered line, when the code came from a file. */
  fileStart?: number
  /**
   * File line per rendered line, when the block is not one contiguous window.
   *
   * Set only by a proposal, where lines are spliced in and so the numbering
   * has a hole in it. Overrides `fileStart` where present.
   */
  fileNumbers?: readonly (number | null)[]
  /**
   * Draw a waypoint's prose box above the line it names.
   *
   * On only in the walkthrough, where a panel carries every waypoint of one
   * file and each has a `// !waypoint` annotation added by the merge. Outermost,
   * so the box sits above the whole line including its gutter and marks.
   */
  waypoint?: boolean
}): AnnotationHandler[] {
  const handlers: AnnotationHandler[] = options.waypoint
    ? [waypointHandler, callout, outline, mark]
    : [callout, outline, mark]
  if (options.lineNumbers) {
    handlers.push(lineNumbersHandler(options.fileStart, options.fileNumbers))
  }
  handlers.push(diff, focus)
  // Last, so it renders the innermost element: the line itself.
  handlers.push(
    lineMetaHandler({
      fileStart: options.fileStart,
      fileNumbers: options.fileNumbers,
    }),
  )
  if (options.wordWrap) handlers.push(wordWrap)
  return handlers
}
