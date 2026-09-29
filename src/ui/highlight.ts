import { highlight, type HighlightedCode } from "codehike/code"
import type { Theme } from "@code-hike/lighter"
import { LANG_NAMES, THEME_NAMES } from "@code-hike/lighter"
import type { CodeReference, Proposal } from "./document/view"
import type { LineRange } from "../lib/schemas/document/primitives"

/**
 * Code Hike highlights through @code-hike/lighter. When lighter cannot resolve
 * a grammar locally it falls back to fetching one from
 * https://lighter.codehike.org, which the panel must never do: it has to work
 * offline, and the request would leak the language name to a third party.
 *
 * Two things prevent that. The build resolves lighter's self-contained entry
 * (see the alias in src/ui/vite.config.ts), and every language is
 * checked against LANG_NAMES here before it reaches lighter.
 */

const FALLBACK_LANGUAGE = "txt"

const supportedLanguages: ReadonlySet<string> = new Set(LANG_NAMES)

/** The theme names lighter has bundled locally. */
export type ThemeName = (typeof THEME_NAMES)[number]

const SUPPORTED_THEMES: readonly ThemeName[] = THEME_NAMES

/**
 * Used only when a host passes a name lighter does not bundle. VS Code's own
 * default dark theme, because the extension falls back to it too.
 */
export const DEFAULT_THEME: ThemeName = "dark-plus"

function isSupportedLanguage(lang: string): boolean {
  return supportedLanguages.has(lang.toLowerCase())
}

function isSupportedTheme(theme: string): theme is ThemeName {
  return (SUPPORTED_THEMES as readonly string[]).includes(theme)
}

/**
 * Highlights one fence. An unknown language degrades to plain text rather than
 * reaching lighter's network fallback.
 */
/**
 * A bundled theme name, or a whole theme object.
 *
 * The object form is how a host supplies the editor's own theme: lighter's
 * `RawTheme` is `{ name?, type?, tokenColors?, colors? }`, which is exactly the
 * shape of a VS Code theme file, so one can be passed through untouched.
 */
export type ThemeInput = string | Record<string, unknown>

/**
 * Validates a theme without discarding a raw one.
 *
 * A name is checked against the bundled list, because an unknown name would
 * send the highlighter to the network. An object is passed straight through:
 * there is no list to check it against, and rejecting it would silently replace
 * the host's theme with a default, which looks like the theme being ignored
 * rather than like an error.
 */
function resolveTheme(theme: ThemeInput): Theme {
  if (typeof theme === "string") {
    return isSupportedTheme(theme) ? theme : DEFAULT_THEME
  }
  if (theme !== null && typeof theme === "object") return theme as Theme
  return DEFAULT_THEME
}

/**
 * Highlights an exact slice of a file, with no window around it.
 *
 * `highlightReference` is the wrong tool for a hover popup: it windows, and a
 * file of six hundred lines or fewer is shown whole, which would put an entire
 * module inside a tooltip. A code link names two or three lines and wants
 * exactly those.
 */
export async function highlightSnippet(
  text: string,
  lang: string,
  theme: ThemeInput,
): Promise<HighlightedCode> {
  const language = isSupportedLanguage(lang) ? lang : FALLBACK_LANGUAGE
  return highlight({ value: text, lang: language, meta: "" }, resolveTheme(theme))
}

/**
 * An empty highlighted block. Steps without code still need one so the code
 * column always renders the same component type, which is what lets Code Hike's
 * token transitions animate between steps instead of remounting.
 */
export async function emptyCode(theme: ThemeInput): Promise<HighlightedCode> {
  return highlight({ value: "", lang: FALLBACK_LANGUAGE, meta: "" }, resolveTheme(theme))
}

/**
 * Above this many lines a file is windowed rather than shown whole.
 *
 * Showing the whole file is the point: a reviewer should be able to look above
 * and below the change without leaving the walkthrough. But highlighting is
 * quadratic enough in practice that a ten-thousand-line file would stall the
 * panel, and nobody scrolls that far anyway.
 */
export const MAX_WHOLE_FILE_LINES = 600

/** Lines kept either side of the focus when a file has to be windowed. */
export const WINDOW_CONTEXT = 60

/**
 * Annotation prefix used when highlighting a referenced file.
 *
 * Code Hike normally reads annotations out of `// !name` comments and deletes
 * those lines from the rendered code. That is right for a fence the author
 * wrote and catastrophic for a file the author only pointed at: a repository
 * file may contain `// !mark` in a comment for its own reasons, and deleting it
 * would shift every line below, silently invalidating the line numbers the
 * whole reference format rests on. Real annotations arrive out of band anyway,
 * so a prefix no source will ever contain turns comment scanning off.
 */
const NO_COMMENT_ANNOTATIONS = "flightplan-no-comment-annotations"

/**
 * What happened to the range when it was checked against its anchor.
 *
 * - `matched`  the anchor is where the range says it is
 * - `repaired` the anchor moved and the range was shifted to follow it
 * - `lost`     the anchor is gone, or appears more than once
 * - `none`     no anchor was given, so nothing was checked
 *
 * `lost` is the case the whole mechanism exists for. Without an anchor a moved
 * range renders confidently wrong; with one, the failure is loud.
 */
export type AnchorState = "matched" | "repaired" | "lost" | "none"

/** A referenced fence, resolved and highlighted. */
export type ResolvedCode = {
  code: HighlightedCode
  /** File line number of the first rendered line. */
  startLine: number
  /** Repository-relative path the code came from. */
  path: string
  /** True when only part of the file is rendered. */
  windowed: boolean
  /** What the anchor check concluded, if there was an anchor. */
  anchor: AnchorState
  /** How far the range moved, when it was repaired. */
  shifted?: number
  /**
   * File line for each rendered line, or null where there is no file line.
   *
   * Only a proposal sets this. Referenced code is a contiguous window, so
   * `startLine` plus an offset is the whole answer; spliced code is not, because
   * the proposed lines are not in the file and the lines after them have not
   * moved yet. Numbering them anyway would invent line numbers that no editor,
   * diff or permalink agrees with.
   */
  numbers?: readonly (number | null)[]
  /** True when the block contains proposed code rather than only file code. */
  proposed?: boolean
}

/**
 * Language for a path, used when the fence does not name one.
 *
 * Deliberately small: lighter normalises most extensions itself, and a wrong
 * guess is worse than plain text because it colours the file misleadingly.
 */
const EXTENSION_LANGUAGES: Record<string, string> = {
  cjs: "js",
  cts: "ts",
  mjs: "js",
  mts: "ts",
  jsx: "jsx",
  tsx: "tsx",
  ts: "ts",
  js: "js",
  json: "json",
  jsonc: "jsonc",
  css: "css",
  html: "html",
  md: "md",
  py: "python",
  rs: "rust",
  go: "go",
  sh: "shellscript",
  sql: "sql",
  tf: "hcl",
  toml: "toml",
  yaml: "yaml",
  yml: "yaml",
}

export function languageOfPath(path: string): string {
  const dot = path.lastIndexOf(".")
  if (dot < 0) return FALLBACK_LANGUAGE
  const extension = path.slice(dot + 1).toLowerCase()
  return EXTENSION_LANGUAGES[extension] ?? FALLBACK_LANGUAGE
}

/**
 * Finds the anchor text and repairs the range if it has moved.
 *
 * Matched by trimmed content rather than exact bytes, so re-indentation does not
 * count as a move. Exactly one match repairs; none or several is `lost`, and the
 * range is then left alone rather than guessed at: showing the wrong lines
 * silently is the failure this exists to prevent, so an unresolvable anchor has
 * to be reported instead of worked around.
 */
export function repairRange(
  lines: readonly string[],
  focus: LineRange,
  anchor: string,
): { focus: LineRange; state: AnchorState; shifted?: number } {
  const wanted = anchor.trim()
  const at = lines[focus.from - 1]
  if (at !== undefined && at.trim().includes(wanted)) {
    return { focus, state: "matched" }
  }

  const hits: number[] = []
  lines.forEach((line, index) => {
    if (line.trim().includes(wanted)) hits.push(index + 1)
  })
  const only = hits.length === 1 ? hits[0] : undefined
  if (only === undefined) return { focus, state: "lost" }

  const shift = only - focus.from
  return {
    focus: { from: focus.from + shift, to: focus.to + shift },
    state: "repaired",
    shifted: shift,
  }
}

/** Lines a change deleted, and the file line the block sat after. 0 is the top. */
export type Removal = { after: number; lines: readonly string[] }

/** A window of a file as it is drawn, and the way back to its file lines. */
export type WindowedLines = {
  /** The text to highlight: the window, with removed blocks spliced back in. */
  value: string
  /** The file line each rendered line came from; null for a removed line. */
  numbers: (number | null)[]
  /** Where each spliced removal sits, in rendered lines. */
  removedBands: LineRange[]
  /** A file range as rendered lines, or null when none of it is on screen. */
  panelRange: (range: LineRange) => { fromLineNumber: number; toLineNumber: number } | null
}

/**
 * The lines a code block draws, and the map from them back to the file.
 *
 * Built together because a removal breaks the one-to-one relation the obvious
 * arithmetic assumes: a deleted line is rendered and has no file line, so every
 * range after it sits further down the block than its numbers suggest. Mapping
 * through `numbers` instead of computing an offset is what keeps the focus, the
 * marks and the diff bands agreeing once anything is spliced in.
 *
 * With no removals `numbers` is exactly `window.from … window.to` and every
 * lookup gives what the arithmetic gave.
 *
 * Its own function because three surfaces draw a window of a file — a
 * waypoint's panel, a proposal, and the popup a `code:` link shows on hover —
 * and the third one went without a diff entirely rather than carry a second
 * copy of this. A second copy is how a band ends up drawn on the wrong lines.
 */
export function windowLines(
  lines: readonly string[],
  window: LineRange,
  removed: readonly Removal[] = [],
): WindowedLines {
  const shown: string[] = []
  const numbers: (number | null)[] = []
  const removedBands: LineRange[] = []

  const spliceRemoval = (after: number): void => {
    for (const block of removed) {
      if (block.after !== after) continue
      const from = shown.length + 1
      for (const line of block.lines) {
        shown.push(line)
        numbers.push(null)
      }
      removedBands.push({ from, to: shown.length })
    }
  }

  // A block removed from the very top of the file, when the top is on screen.
  if (window.from === 1) spliceRemoval(0)
  for (let line = window.from; line <= window.to; line += 1) {
    shown.push(lines[line - 1] ?? "")
    numbers.push(line)
    spliceRemoval(line)
  }

  return {
    value: shown.join("\n"),
    numbers,
    removedBands,
    panelRange: (range) => {
      let first = -1
      let last = -1
      numbers.forEach((line, index) => {
        if (line === null || line < range.from || line > range.to) return
        if (first === -1) first = index
        last = index
      })
      if (first === -1) return null
      return { fromLineNumber: first + 1, toLineNumber: last + 1 }
    },
  }
}

/** Splits file text into lines, without the phantom line a trailing \n adds. */
export function fileLines(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop()
  return lines
}

/**
 * The slice of the file to render.
 *
 * A short file is shown whole, so the focus keeps its context. A long one is
 * cropped around the focus; a long file with no focus shows its head, which is
 * at least a stable place to start reading.
 */
export function chooseWindow(
  totalLines: number,
  focus: LineRange | null,
): LineRange {
  const last = Math.max(1, totalLines)
  if (last <= MAX_WHOLE_FILE_LINES) return { from: 1, to: last }
  if (focus === null) return { from: 1, to: MAX_WHOLE_FILE_LINES }
  return {
    from: Math.max(1, focus.from - WINDOW_CONTEXT),
    to: Math.min(last, focus.to + WINDOW_CONTEXT),
  }
}

/** Turns a range of file lines into rendered line numbers, or null if outside. */
function toRenderedRange(
  range: LineRange,
  window: LineRange,
): { fromLineNumber: number; toLineNumber: number } | null {
  const from = Math.max(range.from, window.from)
  const to = Math.min(range.to, window.to)
  if (from > to) return null
  return {
    fromLineNumber: from - window.from + 1,
    toLineNumber: to - window.from + 1,
  }
}

/**
 * Highlights a file, focusing and marking the lines the fence named.
 *
 * The annotations are attached after highlighting rather than parsed out of
 * comments. That is forced by the model: the code belongs to the repository, so
 * a walkthrough can point at lines but must never write `// !mark` into them.
 */
export async function highlightReference(
  reference: CodeReference,
  marks: readonly LineRange[],
  text: string,
  lang: string,
  theme: ThemeInput,
  /**
   * Lines the change adds, in file numbering.
   *
   * Derived from the pull request's own diff, never authored. A walkthrough says
   * which lines it is *about*; the diff says which lines *changed*. Asking an
   * author to mark the change by hand would give two sources of truth for one
   * fact, and the hand-written one is the half that goes stale.
   */
  added: readonly LineRange[] = [],
  anchor: string | null = null,
  /**
   * Colour for this waypoint's marks, or none for the ordinary accent.
   *
   * Passed in rather than derived here, because it comes from the waypoint's
   * own title: a finding's marks take the colour of its badge, and the cards
   * inside it inherit that. The highlighter is handed a fence and knows nothing
   * about the document around it.
   */
  markColor?: string,
  /**
   * Lines this waypoint's children mark, drawn quietly on it.
   *
   * Derived from the document rather than authored — see `outlineMarks` — and
   * empty for every waypoint that marks something of its own.
   */
  outline: readonly LineRange[] = [],
  /**
   * Lines the change deleted, and the line each block sat after.
   *
   * These have no line in the file being rendered — that is what deleted means
   * — so they are spliced back in and given no number, the same way a plan's
   * proposed lines are. The panel used to say removals could not be shown at
   * all, which was true only while the marks were computed from a raw diff at
   * the moment of opening: nothing had the text any more. Resolved at write
   * time, it survives, and what the change *cost* is usually the comparison a
   * reviewer left the panel to find.
   */
  removed: readonly Removal[] = [],
  /**
   * The slice to render, when something outside has already chosen one.
   *
   * Full screen draws one panel for a run of waypoints on the same file, and
   * that only works while they agree on what the panel shows: a window chosen
   * per waypoint puts each one's own lines in the middle, which is three
   * different views of one file and three panels to draw them in.
   *
   * Null is the ordinary case and keeps `chooseWindow`'s answer, which is what
   * a waypoint read on its own wants.
   */
  forced: LineRange | null = null,
): Promise<ResolvedCode> {
  const lines = fileLines(text)

  // Repaired before the window is chosen, so a moved range is windowed around
  // where the code actually is rather than where it used to be.
  let focus = reference.focus
  let anchorState: AnchorState = "none"
  let shifted: number | undefined
  if (anchor !== null && focus !== null) {
    const repair = repairRange(lines, focus, anchor)
    focus = repair.focus
    anchorState = repair.state
    shifted = repair.shifted
  }

  const window = forced ?? chooseWindow(lines.length, focus)

  /*
   * The window as it is drawn, and the map back to the file.
   *
   * `windowLines` owns the splice arithmetic; see it for why a removal cannot
   * be handled with an offset.
   */
  const { value, numbers, removedBands, panelRange } = windowLines(lines, window, removed)

  const language = isSupportedLanguage(lang) ? lang : languageOfPath(reference.path)
  const code = await highlight(
    { value, lang: language, meta: reference.path },
    resolveTheme(theme),
    { annotationPrefix: NO_COMMENT_ANNOTATIONS },
  )

  if (focus !== null && anchorState !== "lost") {
    const rendered = panelRange(focus)
    if (rendered !== null) {
      code.annotations.push({ name: "focus", query: "", ...rendered })
    }
  }
  /*
   * The marks move with the range they are inside.
   *
   * A mark is written as file lines, but it is written *about* the lines the
   * reference names, so repairing the range without repairing the marks leaves
   * them pointing at whatever now sits where the code used to be. It showed up
   * against a diff, because that is where the mistake is visible: the focus and
   * the diff bands both come from the current file and agreed with each other,
   * while the marks sat a few lines off from both.
   *
   * A lost anchor shifts nothing, which is right: the range was left alone too.
   */
  const drift = anchorState === "repaired" ? (shifted ?? 0) : 0
  const band = (ranges: readonly LineRange[], name: "mark" | "outline") => {
    for (const range of ranges) {
      const moved = drift === 0 ? range : { from: range.from + drift, to: range.to + drift }
      const rendered = panelRange(moved)
      if (rendered !== null) {
        code.annotations.push({ name, query: markColor ?? "", ...rendered })
      }
    }
  }
  band(marks, "mark")
  // The same repair and the same window as a mark, because these ranges are
  // marks: they are written on this waypoint's children rather than on it.
  band(outline, "outline")
  for (const range of added) {
    const rendered = panelRange(range)
    if (rendered !== null) {
      code.annotations.push({ name: "diff", query: "+", ...rendered })
    }
  }
  for (const band of removedBands) {
    code.annotations.push({
      name: "diff",
      query: "-",
      fromLineNumber: band.from,
      toLineNumber: band.to,
    })
  }

  return {
    code,
    startLine: window.from,
    path: reference.path,
    /*
     * Numbers only when something was spliced in.
     *
     * `startLine` describes a panel whose lines run consecutively from one
     * file line, which stops being true the moment a deleted line is drawn
     * among them. Handing back the array then is what lets the gutter leave
     * those lines blank instead of numbering them as if they were there.
     */
    numbers: removedBands.length === 0 ? undefined : numbers,
    windowed: window.from !== 1 || window.to !== lines.length,
    anchor: anchorState,
    shifted,
  }
}

/**
 * A block standing in for a file that could not be read.
 *
 * Rendered as code rather than swallowed, because a broken reference means the
 * walkthrough is describing something that is no longer there, and that is
 * exactly what the reader needs to be told.
 */
export async function unresolvedCode(
  path: string,
  reason: string,
  theme: ThemeInput,
): Promise<ResolvedCode> {
  const code = await highlight(
    {
      value: `Could not read ${path}\n\n${reason}`,
      lang: FALLBACK_LANGUAGE,
      meta: path,
    },
    resolveTheme(theme),
  )
  return { code, startLine: 1, path, windowed: false, anchor: "none" }
}


/**
 * A proposal spliced into the file it changes.
 *
 * `value` is what gets highlighted, `numbers` is the gutter, and the two range
 * lists are in *rendered* line numbers because that is what an annotation
 * takes.
 */
export type Splice = {
  value: string
  numbers: (number | null)[]
  /** The proposed lines. */
  proposed: LineRange[]
  /** Existing lines the proposal supersedes, kept so the change is visible. */
  removed: LineRange[]
  /** The file region the splice touches, for windowing and anchoring. */
  region: LineRange
}

/**
 * Splices proposed lines into a file's lines.
 *
 * A `replace` keeps the lines it supersedes rather than dropping them, so the
 * result reads as a diff: the old code is still there, marked as going away.
 * Hiding it would make a plan look like a finished file and leave the reader
 * with no way to see what the proposal costs.
 */
export function splice(
  lines: readonly string[],
  body: readonly string[],
  at: Proposal["at"],
): Splice {
  if (at.kind === "new") {
    return {
      value: body.join("\n"),
      // A file that does not exist yet still gets numbers: every line of it is
      // proposed, so numbering from 1 is a claim about the finished file and
      // nothing contradicts it.
      numbers: body.map((_, index) => index + 1),
      proposed: [{ from: 1, to: Math.max(1, body.length) }],
      removed: [],
      region: { from: 1, to: Math.max(1, body.length) },
    }
  }

  const last = lines.length
  const clamp = (line: number) => Math.min(Math.max(line, 1), Math.max(last, 1))

  // How much of the file precedes the proposal, and how much it supersedes.
  const { before, skipped } =
    at.kind === "after"
      ? { before: clamp(at.line), skipped: 0 }
      : at.kind === "before"
        ? { before: clamp(at.line) - 1, skipped: 0 }
        : {
            before: clamp(at.from) - 1,
            skipped: clamp(at.to) - clamp(at.from) + 1,
          }

  const head = lines.slice(0, before)
  const superseded = lines.slice(before, before + skipped)
  const tail = lines.slice(before + skipped)

  const value = [...head, ...superseded, ...body, ...tail].join("\n")
  const numbers: (number | null)[] = [
    ...head.map((_, index) => index + 1),
    ...superseded.map((_, index) => before + index + 1),
    ...body.map(() => null),
    ...tail.map((_, index) => before + skipped + index + 1),
  ]

  const proposedFrom = head.length + superseded.length + 1
  return {
    value,
    numbers,
    proposed:
      body.length === 0
        ? []
        : [{ from: proposedFrom, to: proposedFrom + body.length - 1 }],
    removed:
      superseded.length === 0
        ? []
        : [{ from: head.length + 1, to: head.length + superseded.length }],
    region:
      at.kind === "replace"
        ? { from: clamp(at.from), to: clamp(at.to) }
        : { from: clamp(at.line), to: clamp(at.line) },
  }
}

/**
 * Highlights code that does not exist yet, in the file it would live in.
 *
 * This is the one place the project pastes code, and it is less an exception to
 * the reference rule than the one case the rule cannot cover: a plan describes
 * code nobody has written, so there is nothing to point at. What can still be
 * referenced is *where* it goes, and that is what keeps a plan checkable — the
 * path has to exist, the position has to be inside the file, and the anchor has
 * to still be there.
 *
 * The result is deliberately a diff rather than a finished file. A reader who
 * cannot tell a proposal from the code already on disk will act on the wrong
 * one, so proposed lines carry `+`, superseded lines carry `-`, and proposed
 * lines get no line number, because they have none.
 */
export async function highlightProposal(
  proposal: Proposal,
  body: string,
  marks: readonly LineRange[],
  /** The file as it is on the current branch, or null when it does not exist. */
  text: string | null,
  lang: string,
  theme: ThemeInput,
  /** Colour for the marks, as in `highlightReference`. */
  markColor?: string,
): Promise<ResolvedCode> {
  const lines = text === null ? [] : fileLines(text)
  const bodyLines = fileLines(body)

  // The position is repaired before splicing, so a plan written yesterday still
  // inserts next to the code it was written about rather than at a line number
  // that has since drifted into the middle of something else.
  let at = proposal.at
  let anchorState: AnchorState = "none"
  let shifted: number | undefined
  if (proposal.anchor !== null && at.kind !== "new" && lines.length > 0) {
    const target =
      at.kind === "replace"
        ? { from: at.from, to: at.to }
        : { from: at.line, to: at.line }
    const repair = repairRange(lines, target, proposal.anchor)
    anchorState = repair.state
    shifted = repair.shifted
    if (repair.state === "repaired") {
      at =
        at.kind === "replace"
          ? { kind: "replace", from: repair.focus.from, to: repair.focus.to }
          : { kind: at.kind, line: repair.focus.from }
    }
  }

  const spliced = splice(lines, bodyLines, at)

  // Windowed over the spliced text, not the file: the proposal is what the
  // reader came for, so it is what the window has to keep.
  const proposedRange = spliced.proposed[0] ?? spliced.region
  const window = chooseWindow(spliced.numbers.length, proposedRange)
  const value = spliced.value
    .split("\n")
    .slice(window.from - 1, window.to)
    .join("\n")

  const language = isSupportedLanguage(lang)
    ? lang
    : languageOfPath(proposal.path)
  const code = await highlight(
    { value, lang: language, meta: proposal.path },
    resolveTheme(theme),
    { annotationPrefix: NO_COMMENT_ANNOTATIONS },
  )

  for (const range of spliced.proposed) {
    const rendered = toRenderedRange(range, window)
    if (rendered !== null) {
      code.annotations.push({ name: "diff", query: "+", ...rendered })
      code.annotations.push({ name: "focus", query: "", ...rendered })
    }
  }
  for (const range of spliced.removed) {
    const rendered = toRenderedRange(range, window)
    if (rendered !== null) {
      code.annotations.push({ name: "diff", query: "-", ...rendered })
    }
  }
  // A mark on a proposal counts from the first proposed line, because file
  // line numbers cannot address lines that are not in the file.
  const bodyStart = spliced.proposed[0]?.from ?? 1
  for (const range of marks) {
    const rendered = toRenderedRange(
      { from: bodyStart + range.from - 1, to: bodyStart + range.to - 1 },
      window,
    )
    if (rendered !== null) {
      code.annotations.push({ name: "mark", query: markColor ?? "", ...rendered })
    }
  }

  return {
    code,
    startLine: window.from,
    path: proposal.path,
    windowed: window.from !== 1 || window.to !== spliced.numbers.length,
    anchor: anchorState,
    shifted,
    numbers: spliced.numbers.slice(window.from - 1, window.to),
    proposed: true,
  }
}
