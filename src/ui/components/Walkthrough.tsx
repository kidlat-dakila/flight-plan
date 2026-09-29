import { RendererHostProvider, type RendererHost } from "../host"
import { DEFAULT_CODE_WIDTH } from "../width"
import {
  MAX_WHOLE_FILE_LINES,
  chooseWindow,
  emptyCode,
  fileLines,
  highlightProposal,
  highlightReference,
  highlightSnippet,
  languageOfPath,
  repairRange,
  unresolvedCode,
  windowLines,
  type ResolvedCode,
  type ThemeInput,
} from "../highlight"
import { inheritedKinds, waypointSlugs } from "../parse/anchor"
import { markColorFor } from "./handlers"
import { outlineMarks } from "../marks"
import { buildFileReference, referenceSubject } from "../reference"
import {
  Scrollycoding,
  type NodePanel,
  type PreparedBlock,
  type PreparedLayout,
  type PreparedStep,
} from "./Scrollycoding"
import type { CodeLinkExcerpt } from "./CodeLinks"
import type { ReviewControls } from "./waypointBox"
import type { DiagramExcerpt, DiagramExcerpts } from "./Diagram"
import {
  labelIdentifier,
  linkKey,
  parseCodeLinks,
  type CodeLink,
} from "../../lib/schemas/document/codeLinks"
import { diagramPaths, type StoredDocument } from "../../lib/schemas/document/stored"
import { checkDiagram, type DiagramNode } from "../../lib/schemas/diagram/schema"
import { checkBlast } from "../../lib/schemas/diagram/blast"
import {
  documentView,
  proseFields,
  referencedPaths,
  type BandBlock,
  type ViewFence,
  type ViewStep,
} from "../document/view"
import type { LineRange } from "../../lib/schemas/document/primitives"
import "../styles/diagram.css"
import "../styles/blast.css"
import { useEffect, useState } from "react"

type Props = {
  /** The stored document, as the API serves it. */
  document: StoredDocument
  host: RendererHost
  /** A bundled theme name, or the host editor's own theme object. */
  theme: ThemeInput
  planRef: string
  toolHint: string
  /** Anchors for linking a waypoint back to the pull request's diff. */
  links?: { prUrl: string; anchors: Record<string, string> } | null
  /**
   * Cited files the host says are safe to open in the editor.
   *
   * Anything not listed goes to the pull request instead, and a selection in it
   * is qualified with the commit, because a bare path would resolve against
   * whatever is on disk rather than what the walkthrough means.
   */
  openable?: string[] | null
  /** Repository and commit, for qualifying references and nothing else. */
  at?: { repo: string; sha: string } | null
  /** The reader's reviewed marks, where the page can store them. */
  review?: ReviewControls
}

/**
 * The link out to the change a waypoint describes.
 *
 * `R` is the right-hand, head-side line numbering, which is what a walkthrough
 * cites. `/files` is GitHub's canonical diff route. Nothing is produced when
 * there is no pull request behind the document, or no range to point at.
 */
function linkFor(
  links: Props["links"],
  path: string | null,
  range: { from: number; to: number } | null,
): { href: string; label: string } | null {
  if (!links || path === null) return null
  const anchor = links.anchors[path]
  if (anchor === undefined) return null
  const at =
    range === null
      ? ""
      : range.from === range.to
        ? `R${String(range.from)}`
        : `R${String(range.from)}-R${String(range.to)}`
  const lines =
    range === null
      ? "in the diff"
      : range.from === range.to
        ? `L${String(range.from)}`
        : `L${String(range.from)}-${String(range.to)}`
  return { href: `${links.prUrl}/files#diff-${anchor}${at}`, label: lines }
}

/**
 * A link to the file itself at the commit the walkthrough was written against.
 *
 * The fallback for everything `linkFor` cannot reach. A diff anchor exists only
 * for files the pull request *changes*, so a diagram's call-stack nodes — most
 * of them, by design — had no link at all. A blob permalink needs nothing but
 * the repository, the commit and the path, and it lands on the same lines.
 */
function blobLink(
  at: Props["at"],
  path: string,
  range: { from: number; to: number } | null,
): { href: string; label: string } | null {
  if (at == null) return null
  const lines =
    range === null
      ? ""
      : range.from === range.to
        ? `#L${String(range.from)}`
        : `#L${String(range.from)}-L${String(range.to)}`
  return {
    href: `https://github.com/${at.repo}/blob/${at.sha}/${path}${lines}`,
    label: "on GitHub",
  }
}

/**
 * Where an excerpt's path should take the reader.
 *
 * The editor when this exact file is on disk at the right commit, because that
 * is where they can act on it. Otherwise the diff, which is the useful
 * destination for a file the change touches, and otherwise the file itself.
 */
function excerptTarget(
  links: Props["links"],
  at: Props["at"],
  openable: readonly string[],
  path: string,
  range: { from: number; to: number } | null,
): DiagramExcerpt["open"] {
  if (openable.includes(path)) {
    return { kind: "editor", path, line: range?.from ?? 1 }
  }
  const diff = linkFor(links, path, range)
  if (diff !== null) return { kind: "link", href: diff.href, label: "in the diff" }
  const blob = blobLink(at, path, range)
  return blob === null ? null : { kind: "link", href: blob.href, label: blob.label }
}

/** The half of a node's panel that comes from reading and highlighting a file. */
type PanelCode = Pick<
  NodePanel,
  | "code"
  | "filePath"
  | "fileStart"
  | "fileNumbers"
  | "windowed"
  | "anchor"
  | "shifted"
  | "fileLink"
>

/**
 * The clipboard reference for a range of a file.
 *
 * The same string the diagram's hover card copies, built in one place so the
 * card, the panel header and the panel's own button cannot disagree about what
 * "this code" is called.
 */
function annotationFor(
  path: string,
  range: { from: number; to: number } | null,
  at: Props["at"],
): string {
  return range === null
    ? referenceSubject(path, at)
    : buildFileReference({ path, from: range.from, to: range.to, at: at ?? null })
}

/**
 * Where "Go to source" sends the reader, which depends on whether the change
 * touched this file.
 *
 * A node the change touches goes to the pull request: there is a diff to read
 * and a place to comment, and that is what a reviewer wants from a changed
 * file. A node it does not touch goes to the file in the reader's own editor,
 * because there is no diff to show and the local copy is the same code.
 *
 * Deliberately the opposite priority to `excerptTarget`, which prefers the
 * editor whenever the file is on disk. That is right for the hover card's path
 * link, where the reader asked for the file; this is right for a button that
 * says "source".
 */
export function sourceTarget(
  changed: boolean,
  links: Props["links"],
  at: Props["at"],
  openable: readonly string[],
  path: string,
  range: { from: number; to: number } | null,
): DiagramExcerpt["open"] {
  if (changed) {
    const diff = linkFor(links, path, range)
    if (diff !== null) return { kind: "link", href: diff.href, label: "in the diff" }
  }
  if (openable.includes(path)) {
    return { kind: "editor", path, line: range?.from ?? 1 }
  }
  const blob = blobLink(at, path, range)
  return blob === null ? null : { kind: "link", href: blob.href, label: blob.label }
}

/**
 * One diagram node's code, prepared for the code column.
 *
 * The same treatment a waypoint's reference gets, minus the marks: the file at the
 * walkthrough's own commit, the node's range focused, the anchor followed if the
 * lines have moved, and the change's own added lines marked from the diff.
 *
 * Returns null when the file could not be read. A node whose file is missing
 * keeps its hover card and simply is not clickable, which is honest — the
 * alternative was a card that promised code and delivered an error panel.
 */
async function nodePanelFor(
  source: NonNullable<DiagramNode["sources"]>[number],
  files: Map<string, FileResult>,
  theme: ThemeInput,
  diffs: Changes,
  links: Props["links"],
): Promise<PanelCode | null> {
  const file = files.get(source.path)
  if (file === undefined || "error" in file) return null

  // Already `{ from, to }`: the schema takes the JSON's `[a, b]` and normalises
  // it. Indexing it as a tuple read `undefined` from an object and focused
  // nothing.
  const focus = source.lines ?? null
  const resolved = await highlightReference(
    { path: source.path, focus },
    [],
    file.text,
    languageOfPath(source.path),
    theme,
    diffs?.[source.path]?.added ?? [],
    source.anchor ?? null,
    undefined,
    [],
    diffs?.[source.path]?.removed ?? [],
  )
  return {
    code: resolved.code,
    filePath: resolved.path === "" ? null : resolved.path,
    fileStart: resolved.startLine,
    fileNumbers: resolved.numbers,
    windowed: resolved.windowed,
    anchor: resolved.anchor,
    shifted: resolved.shifted,
    fileLink: linkFor(links, source.path, focus),
  }
}

/** Lines a change added, and the blocks it deleted with the line each followed. */
export type Change = {
  added: readonly { from: number; to: number }[]
  removed: readonly { after: number; lines: readonly string[] }[]
}

/** What the change did to each file, from the document's own `sources`. */
type Changes = Record<string, Change> | null

/** A file the walkthrough named, once the host has tried to read it. */
type FileResult = { text: string } | { error: string }

/**
 * Reads every file the walkthrough references.
 *
 * All of them at once: a walkthrough with twelve waypoints across four files
 * should cost four reads in parallel, not twelve in series. A failure is kept
 * rather than thrown, so one missing file does not blank the whole walkthrough.
 */
async function readFiles(
  paths: string[],
  host: RendererHost,
): Promise<Map<string, FileResult>> {
  const files = new Map<string, FileResult>()
  const read = host.readFile
  await Promise.all(
    paths.map(async (path) => {
      try {
        files.set(path, { text: await read(path) })
      } catch (cause) {
        files.set(path, { error: String(cause) })
      }
    }),
  )
  return files
}

/**
 * The same panel, with a finding's fix standing in for the lines it is about.
 *
 * A solution names no path and no position: it is the replacement for the
 * card's own lines — a waypoint's, or a document finding's `code` — so the
 * position is the host fence's resolved range and the file is the host fence's
 * file. That is the whole reason a fix can be
 * previewed at all — there is nothing to reconcile between what the card shows
 * and what the fix changes, because they are the same lines.
 *
 * Built alongside the ordinary panel rather than on demand. Highlighting is
 * asynchronous and a click is far too late to start it, which is the same
 * reason the code-link popups are prepared up front.
 *
 * Null when the card has no fix to show, or shows code that does not exist yet:
 * a proposal is already the code being suggested, so a fix for it is just
 * different code.
 */
async function prepareFix(
  step: ViewStep,
  files: Map<string, FileResult>,
  theme: ThemeInput,
  markColor: string | undefined,
): Promise<ResolvedCode | null> {
  const solution =
    step.solution ?? (step.findings ?? []).find((one) => one.solution !== undefined)?.solution
  if (solution === undefined) return null

  const fence = step.code
  const reference = fence?.reference ?? null
  if (fence === null || reference === null || fence.proposal !== null) return null

  const file = files.get(reference.path)
  if (file === undefined || "error" in file) return null

  const focus = reference.focus
  if (focus === null) return null

  return highlightProposal(
    {
      path: reference.path,
      at: { kind: "replace", from: focus.from, to: focus.to },
      anchor: fence.anchor,
    },
    solution.body,
    [],
    file.text,
    solution.lang,
    theme,
    markColor,
  )
}

/** Highlights one waypoint's code, whether it is referenced or pasted. */
async function prepareCode(
  step: ViewStep,
  files: Map<string, FileResult>,
  theme: ThemeInput,
  blank: ResolvedCode,
  diffs: Changes,
  /** Colour for this waypoint's marks, from the finding it belongs to. */
  markColor: string | undefined,
  /**
   * Lines this waypoint's children mark, when it marks nothing itself.
   *
   * A proposal takes none: its marks count from the first proposed line
   * rather than from the file, so a child's range means something different
   * there and deriving one from the other would put a band on the wrong lines.
   */
  outline: readonly LineRange[],
  /** The slice to render, when this waypoint shares a panel with its neighbours. */
  forced: LineRange | null,
): Promise<ResolvedCode> {
  const fence = step.code
  if (fence === null) return blank

  const proposal = fence.proposal
  if (proposal !== null) {
    // A proposal's file may legitimately be missing: `!new` proposes one that
    // does not exist yet. A missing file for any other position is reported by
    // the validator, and rendering the body alone is still the useful answer.
    const existing = files.get(proposal.path)
    const text =
      existing === undefined || "error" in existing ? null : existing.text
    return highlightProposal(
      proposal,
      fence.body,
      fence.marks,
      text,
      fence.lang,
      theme,
      markColor,
    )
  }

  const reference = fence.reference
  // A fence is a reference or a proposal; one with neither has no code.
  if (reference === null) return blank

  const file = files.get(reference.path)
  if (file === undefined || "error" in file) {
    return unresolvedCode(
      reference.path,
      file === undefined ? "The file was never requested." : file.error,
      theme,
    )
  }
  return highlightReference(
    reference,
    fence.marks,
    file.text,
    fence.lang,
    theme,
    diffs?.[reference.path]?.added ?? [],
    fence.anchor,
    markColor,
    outline,
    diffs?.[reference.path]?.removed ?? [],
    forced,
  )
}

/**
 * The file lines a waypoint points at, whatever kind of fence it has.
 *
 * A proposal has no focus range, because the lines it is about are not in the
 * file. What it does have is a position, and that is where a reader wants to
 * land: the code the new lines would go next to.
 */
function citedRange(
  fence: ViewFence | null | undefined,
): { from: number; to: number } | null {
  if (fence == null) return null
  if (fence.reference !== null) return fence.reference.focus
  const at = fence.proposal?.at
  if (at === undefined || at.kind === "new") return null
  return at.kind === "replace"
    ? { from: at.from, to: at.to }
    : { from: at.line, to: at.line }
}

/**
 * Where a waypoint's open button goes.
 *
 * The editor when the host has said this exact file is on disk at the right
 * commit, and the pull request otherwise. Never a guess: an editor showing a
 * different version at the same line numbers is worse than a browser tab.
 */
function openFor(
  links: Props["links"],
  openable: readonly string[],
  path: string | null,
  range: { from: number; to: number } | null,
): PreparedStep["open"] {
  if (path === null) return null
  if (openable.includes(path)) {
    return { kind: "editor", path, line: range?.from ?? 1 }
  }
  const link = linkFor(links, path, range)
  return link === null ? null : { kind: "link", href: link.href }
}

/**
 * Resolves the references a diagram's nodes point at.
 *
 * No highlighting: the hover card shows the path and a copy button now, not the
 * code, so compiling a grammar per node bought nothing. The file is still read,
 * and that is not optional — `repairRange` needs it. A node's range drifts
 * exactly as a waypoint's does, and a copy button that hands over a stale range
 * is worse than no button, because the reference looks right.
 *
 * A node whose file cannot be read keeps its recorded range and loses its link.
 * A diagram missing one card's reference is still a useful map; refusing to draw
 * it would not be.
 */
function prepareExcerpts(
  nodes: readonly DiagramNode[],
  files: Map<string, FileResult>,
  links: Props["links"],
  at: Props["at"],
  openable: readonly string[],
): DiagramExcerpts {
  const excerpts: DiagramExcerpts = {}

  for (const node of nodes) {
    for (const source of node.sources ?? []) {
      const file = files.get(source.path)
      const text = file === undefined || "error" in file ? null : file.text

      let focus = source.lines ?? null
      if (text !== null && focus !== null && source.anchor !== undefined) {
        const repair = repairRange(fileLines(text), focus, source.anchor)
        // `lost` leaves the range alone rather than guessing, exactly as the
        // code panel does: a range that cannot be trusted should not be
        // silently moved.
        if (repair.state === "repaired") focus = repair.focus
      }

      ;(excerpts[node.id] ??= []).push({
        path: source.path,
        lines:
          focus === null
            ? ""
            : focus.from === focus.to
              ? `L${String(focus.from)}`
              : `L${String(focus.from)}-${String(focus.to)}`,
        from: focus?.from,
        to: focus?.to,
        // Qualified only when the reader cannot open the file themselves, the
        // same rule the waypoint selection reference follows.
        at: at == null || openable.includes(source.path) ? null : at,
        open: excerptTarget(links, at, openable, source.path, focus),
      })
    }
  }

  return excerpts
}

/**
 * What deciding a shared window needs to know about a waypoint.
 *
 * `total` is the file's length, and 0 says it could not be read — which is
 * enough on its own to keep a waypoint out of a run, because nothing can be
 * windowed without it.
 */
export type WindowedStep = {
  path: string | null
  /** The lines the waypoint is about, repaired, or null for a whole file. */
  focus: LineRange | null
  /** A proposal renders lines the file does not have. */
  proposal: boolean
  total: number
}

/** The two ranges as one, which is what a shared window has to cover. */
function union(a: LineRange | null, b: LineRange | null): LineRange | null {
  if (a === null) return b
  if (b === null) return a
  return { from: Math.min(a.from, b.from), to: Math.max(a.to, b.to) }
}

/**
 * The window each waypoint should be rendered in, or null to choose its own.
 *
 * Consecutive waypoints on one file are drawn in one panel, and a panel can
 * only show one slice — so they have to be windowed together rather than each
 * around its own lines. For a file of six hundred lines or fewer this changes
 * nothing at all: `chooseWindow` already shows it whole, which is why those
 * waypoints were rendering the same code two and three times over.
 *
 * The run is cut when the window covering it would exceed what a panel shows
 * whole. Two waypoints eight hundred lines apart do belong to one file, but one
 * panel for them means rendering every line in between, and a reader asked for
 * neither those lines nor the scrolling. They stay two panels, exactly as now.
 *
 * A lone waypoint keeps its own window — null — so nothing about reading a
 * walkthrough one waypoint at a time changes.
 */
export function sharedWindows(
  steps: readonly WindowedStep[],
): (LineRange | null)[] {
  const windows: (LineRange | null)[] = steps.map(() => null)
  let run: number[] = []
  let focus: LineRange | null = null

  const close = () => {
    if (run.length > 1) {
      const total = steps[run[0] ?? 0]?.total ?? 0
      const window = chooseWindow(total, focus)
      for (const index of run) windows[index] = window
    }
    run = []
    focus = null
  }

  steps.forEach((step, index) => {
    const previous = steps[run[run.length - 1] ?? -1]
    const joins =
      previous !== undefined &&
      step.path !== null &&
      previous.path === step.path &&
      !previous.proposal &&
      !step.proposal &&
      step.total > 0

    if (!joins) {
      close()
      if (step.path === null || step.proposal || step.total === 0) return
      run = [index]
      focus = step.focus
      return
    }

    const wider = union(focus, step.focus)
    const window = chooseWindow(step.total, wider)
    if (window.to - window.from + 1 > MAX_WHOLE_FILE_LINES) {
      // Too far apart to share a panel: close the run here and let this
      // waypoint open the next one.
      close()
      run = [index]
      focus = step.focus
      return
    }

    run.push(index)
    focus = wider
  })

  close()
  return windows
}

/**
 * Lines kept either side of the range a `code:` link names.
 *
 * A link usually names two or three lines, and two or three lines lifted out of
 * a file are hard to place: a reader hovering `qualifies()` wants to see what
 * guards it and what it hands back. Ten either side covers the surrounding
 * block without turning the popup into the file.
 *
 * Smaller than `WINDOW_CONTEXT`'s sixty, deliberately. That one windows a panel
 * the reader scrolls; this one hovers, and a popup they have to scroll is a
 * popup that has stopped being a glance.
 */
const LINK_CONTEXT = 10

/**
 * The slice to show for a link: the lines it names, plus context, clamped.
 *
 * Exported for its tests. The clamping is the part worth pinning down, because
 * a range within ten lines of either end of a file is where an off-by-one shows
 * up — as a blank leading line, or as a window that has quietly slid off the
 * lines it was supposed to be about.
 */
export function linkWindow(range: LineRange, totalLines: number): LineRange {
  const last = Math.max(1, totalLines)
  return {
    from: Math.max(1, range.from - LINK_CONTEXT),
    to: Math.min(last, range.to + LINK_CONTEXT),
  }
}

/**
 * The words a language puts in front of the thing it is declaring.
 *
 * Every language this renderer highlights is in here, which is the only reason
 * a keyword list is enough: the name alone appears at every call site, and a
 * search for it would find the uses rather than the declaration.
 *
 * A form nobody named — a class method, an object literal's property — matches
 * nothing and is handled by the caller falling back, which is the honest
 * outcome for a shape this cannot recognise.
 */
const DECLARES = [
  "function",
  "class",
  "const",
  "let",
  "var",
  "type",
  "interface",
  "enum",
  "struct",
  "trait",
  "impl",
  "def",
  "fn",
  "func",
  "record",
]

/**
 * The line a symbol is declared on, or null when that cannot be said.
 *
 * `code:path#getUser` is the form this format asks authors to prefer, because
 * a name survives the file being edited above it where a line number does not.
 * Nothing resolves it at read time, though: symbols are looked up by grammar
 * when a document is stored, and the range that lookup found is not kept. So
 * the popup had the whole file and no idea which part of it the link meant.
 *
 * Exactly one match, or nothing — the rule `repairRange` uses for an anchor,
 * and for the same reason. Two declarations of one name is a file this cannot
 * read correctly, and showing the wrong one silently is worse than showing the
 * file from the top and letting the reader look.
 *
 * Exported for its tests.
 */
export function declarationLine(
  lines: readonly string[],
  symbol: string,
): number | null {
  // The symbol comes out of an href, so it is whatever the author typed.
  const name = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  if (name === "") return null

  const declaration = new RegExp(`\\b(?:${DECLARES.join("|")})\\s+${name}\\b`)
  const hits: number[] = []
  lines.forEach((line, index) => {
    if (declaration.test(line)) hits.push(index + 1)
  })
  return hits.length === 1 ? (hits[0] ?? null) : null
}

/**
 * Prepares the excerpt behind each `code:` link in the prose.
 *
 * One per distinct target, so a link repeated across three trace steps costs
 * one read and one highlight.
 *
 * The named lines with `LINK_CONTEXT` either side, and the named lines focused
 * inside it. Exactly as named was the first version and it was too little: two
 * lines with nothing around them tell a reader what the code says and not what
 * it sits in. `highlightReference` is still the wrong tool for the other
 * direction — it shows a file of six hundred lines or fewer whole, which is an
 * entire module inside a tooltip.
 *
 * The label is the anchor. When the identifier it names is not in the range any
 * more, the excerpt is marked `drifted` rather than dropped: the lines are
 * still worth showing, and a reader should be told they may have moved. A link
 * whose file cannot be read is left with no excerpt at all, which renders as an
 * ordinary span of code in the prose and no popup.
 */
export async function prepareCodeLinks(
  links: readonly CodeLink[],
  files: Map<string, FileResult>,
  theme: ThemeInput,
  /**
   * What the change did to each file, so the popup can show it.
   *
   * The popup used to carry a focus and nothing else, so a link into changed
   * code showed the lines with no sign that they were the change. Every other
   * code surface draws the diff; this one had the handler and the stylesheet
   * already in place and nothing supplying the data.
   */
  diffs?: Record<string, Change> | null,
): Promise<Record<string, CodeLinkExcerpt>> {
  const excerpts: Record<string, CodeLinkExcerpt> = {}

  await Promise.all(
    [...new Map(links.map((link) => [link.target, link])).values()].map(async (link) => {
      const file = files.get(link.path)
      if (file === undefined || "error" in file) return

      const lines = fileLines(file.text)
      /*
       * The lines this link is about, however it named them.
       *
       * A symbol is looked for where it is declared; a name that is declared
       * twice, or in a form the search does not know, comes back null and the
       * link falls through to the whole file exactly as it did before.
       */
      const declared =
        link.symbol === null ? null : declarationLine(lines, link.symbol)
      const range =
        link.lines ?? (declared === null ? null : { from: declared, to: declared })
      const named = range ?? { from: 1, to: lines.length }
      // A whole-file link is already whole, so there is nothing to pad it with.
      const window = range === null ? named : linkWindow(named, lines.length)

      const namedText = lines.slice(named.from - 1, named.to).join("\n")
      if (namedText.trim() === "") return

      /*
       * The window as it is drawn, with any deleted block put back.
       *
       * Through `windowLines` rather than a slice, because a deletion has to be
       * visible: the lines are gone from the file, so nothing but splicing them
       * back shows a reader that the change removed anything. That is also why
       * every range below is mapped through `panelRange` instead of subtracting
       * `window.from` — a spliced line has no file line, and the arithmetic that
       * worked while the block was contiguous quietly stops being true.
       */
      const change = diffs?.[link.path]
      const drawn = windowLines(lines, window, change?.removed ?? [])
      const spliced = drawn.removedBands.length > 0

      const code = await highlightSnippet(drawn.value, languageOfPath(link.path), theme)
      // The named lines are focused within their context, so the reader can see
      // which lines the link is about without losing what surrounds them.
      // Attached after highlighting rather than written into the source, the
      // same way `highlightReference` does it: the code belongs to the
      // repository, so a walkthrough may point at lines but never annotate them.
      if (range !== null) {
        const rendered = drawn.panelRange(named)
        if (rendered !== null) {
          code.annotations.push({ name: "focus", query: "", ...rendered })
        }
      }
      for (const added of change?.added ?? []) {
        const rendered = drawn.panelRange(added)
        if (rendered !== null) {
          code.annotations.push({ name: "diff", query: "+", ...rendered })
        }
      }
      for (const band of drawn.removedBands) {
        code.annotations.push({
          name: "diff",
          query: "-",
          fromLineNumber: band.from,
          toLineNumber: band.to,
        })
      }

      const wanted = labelIdentifier(link.label)
      // Keyed the way the popup looks it up: a target and the `href` the
      // Markdown renderer emits for it are not the same string.
      excerpts[linkKey(link.target)] = {
        path: link.path,
        // The named range, never the padded one. It is what the link is about,
        // and what a reader checking against their editor is looking for.
        lines:
          range === null
            ? ""
            : named.from === named.to
              ? `L${String(named.from)}`
              : `L${String(named.from)}-${String(named.to)}`,
        startLine: window.from,
        // Numbers per line only when something was spliced in; a contiguous
        // window is fully described by where it starts.
        ...(spliced ? { fileNumbers: drawn.numbers } : {}),
        code,
        // Checked against the named lines alone. Against the padded text a
        // label that had moved five lines would be found in the context and the
        // drift would go unreported — which is the silent wrongness this flag
        // exists to make loud.
        drifted: wanted !== null && !namedText.includes(wanted),
      }
    }),
  )

  return excerpts
}

/**
 * An excerpt per waypoint, keyed by the anchor an Overview item links to.
 *
 * The two lists above the tour are where a reviewer decides what to read, and
 * deciding used to mean navigating: an item said which waypoint explained it
 * and nothing about the code. Hovering the link now shows the lines that
 * waypoint is about.
 *
 * The focus range only, highlighted on its own. A waypoint's own panel may be a
 * whole six-hundred-line file, and the point here is the few lines the item is
 * about.
 *
 * A waypoint with no reference — a proposal, or a fence with pasted code — gets
 * none, and its link behaves as it always did.
 */
async function prepareWaypointLinks(
  steps: readonly ViewStep[],
  files: Map<string, FileResult>,
  theme: ThemeInput,
  /** What the change did to each file, so the popup shows it like the panel. */
  diffs?: Record<string, Change> | null,
): Promise<Record<string, CodeLinkExcerpt>> {
  const slugs = waypointSlugs(steps.map((step) => step.title))
  const excerpts: Record<string, CodeLinkExcerpt> = {}

  await Promise.all(
    steps.map(async (step, index) => {
      const reference = step.code?.reference
      const slug = slugs[index]
      if (reference == null || slug === undefined || slug === "") return

      const file = files.get(reference.path)
      if (file === undefined || "error" in file) return

      const lines = fileLines(file.text)
      let focus = reference.focus
      /*
       * A repaired range drags its marks with it.
       *
       * A mark is written in file lines but it is written *about* the lines
       * the reference names, so shifting the range without shifting the marks
       * leaves them on whatever now sits where the code used to be. The code
       * panel already does this in `highlightReference`; the popup has to agree
       * with it or the same waypoint is marked in two places differently.
       */
      let drift = 0
      if (focus !== null && step.code?.anchor != null) {
        const repair = repairRange(lines, focus, step.code.anchor)
        if (repair.state === "repaired") {
          drift = repair.focus.from - focus.from
          focus = repair.focus
        }
      }
      const named = focus ?? { from: 1, to: Math.min(lines.length, 12) }
      const namedText = lines.slice(named.from - 1, named.to).join("\n")
      if (namedText.trim() === "") return

      /*
       * The same window a `code:` link gets, for the same reason.
       *
       * These two popups were built at different times and only the other one
       * was widened, so an Overview link showed its waypoint's lines with
       * nothing around them — which is the shape that made the code link hard
       * to place in the first place. One `linkWindow` for both, so the two
       * kinds of link behave the same way when hovered.
       */
      const window = linkWindow(named, lines.length)
      /*
       * Drawn the way a `code:` link's popup is drawn, deletions included.
       * `windowLines` owns the splice; every range below is mapped through its
       * `panelRange`, because a spliced line has no file line and the offset
       * arithmetic stops being true the moment one is put back.
       */
      const change = diffs?.[reference.path]
      const drawn = windowLines(lines, window, change?.removed ?? [])
      const spliced = drawn.removedBands.length > 0
      const code = await highlightSnippet(
        drawn.value,
        languageOfPath(reference.path),
        theme,
      )
      const focusRange = drawn.panelRange(named)
      if (focusRange !== null) {
        code.annotations.push({ name: "focus", query: "", ...focusRange })
      }
      for (const added of change?.added ?? []) {
        const rendered = drawn.panelRange(added)
        if (rendered !== null) {
          code.annotations.push({ name: "diff", query: "+", ...rendered })
        }
      }
      for (const band of drawn.removedBands) {
        code.annotations.push({
          name: "diff",
          query: "-",
          fromLineNumber: band.from,
          toLineNumber: band.to,
        })
      }

      /*
       * And the marks, so the popup says which lines it is *about*.
       *
       * The focus only dims what is around the range; the mark is the blue band
       * that points at the code. A waypoint that marks nothing gets its whole
       * named range marked instead, because a reader hovering an Overview link
       * is asking exactly "which lines is this" and a popup that answered only
       * by dimming made them count rows to find out.
       *
       * Clipped to the window rather than assumed inside it: a mark near the
       * end of a long range can fall outside the ten lines of context, and an
       * annotation past the last rendered line is dropped silently.
       */
      const marks = step.code?.marks ?? []
      const bands = marks.length > 0
        ? marks.map((mark) => ({ from: mark.from + drift, to: mark.to + drift }))
        : [named]
      for (const band of bands) {
        const rendered = drawn.panelRange(band)
        if (rendered === null) continue
        code.annotations.push({ name: "mark", query: "", ...rendered })
      }

      excerpts[`#${slug}`] = {
        path: reference.path,
        // The waypoint's own range, not the padded one: it is what the link is
        // about and what the reader checks against their editor.
        lines: `L${String(named.from)}-${String(named.to)}`,
        startLine: window.from,
        ...(spliced ? { fileNumbers: drawn.numbers } : {}),
        code,
      }
    }),
  )

  return excerpts
}

/**
 * Turns walkthrough markdown into a rendered scrollycoding.
 *
 * Three passes: read the document, fetch the files it references, then highlight.
 * Fetching sits in the middle because a walkthrough does not carry code, only
 * the paths and line ranges of code, and until the host has resolved those
 * there is nothing to highlight.
 */
export function Walkthrough({
  document,
  host,
  theme,
  planRef,
  toolHint,
  links,
  openable,
  at,
  review,
}: Props) {
  const [layout, setLayout] = useState<PreparedLayout | null>(null)
  const [linkExcerpts, setLinkExcerpts] = useState<Record<string, CodeLinkExcerpt>>({})
  const [nodePanels, setNodePanels] = useState<NodePanel[]>([])
  const [error, setError] = useState<string | null>(null)
  const drafting = document.meta.status === "drafting"

  useEffect(() => {
    let cancelled = false

    async function prepare() {
      /*
       * The document's own structure, laid out: the bands, the tour's files and
       * findings, and every card in order. Nothing is read from headings.
       */
      const view = documentView(document)
      const sections = view.steps

      /*
       * What the change did to each file, from the document itself.
       *
       * Resolved when it was written, against the commit it names, so it is
       * right whether or not a adapter can be reached: a walkthrough opened on
       * plain git, offline, or from storage still shows its marks.
       */
      const changes: Changes = Object.fromEntries(
        Object.entries(document.sources).map(([path, entry]) => [
          path,
          { added: entry.hunks?.added ?? [], removed: entry.hunks?.removed ?? [] },
        ]),
      )
      /*
       * No early return for a document with no waypoints.
       *
       * That is what every walkthrough looks like for the first minute of being
       * built, and the context section — the part a reader can act on soonest —
       * has just arrived. The passes below all cope with an empty list.
       */

      // Diagram node sources are fetched with the waypoints' files, in the
      // same pass: a node pointing at a file a waypoint already cites costs
      // nothing extra, and most of them do. `diagramPaths` is the same list the
      // extension uses to decide which files a card can open.
      const proseLinks = proseFields(document).flatMap(parseCodeLinks)
      const files = await readFiles(
        [
          ...new Set([
            ...referencedPaths(sections),
            ...diagramPaths(document),
            ...proseLinks.map((link) => link.path),
          ]),
        ],
        host,
      )
      if (cancelled) return

      const empty = await emptyCode(theme)
      const blank: ResolvedCode = {
        code: empty,
        startLine: 1,
        path: "",
        windowed: false,
        anchor: "none",
      }
      // Prepared alongside the code panels: both read the same files, and
      // neither needs the other.
      const [linkedCode, linkedWaypoints] = await Promise.all([
        prepareCodeLinks(proseLinks, files, theme, changes),
        prepareWaypointLinks(sections, files, theme, changes),
      ])
      // One map: `CodeLinks` keys on the href as written, so a `#slug` and a
      // `code:` target sit side by side.
      const excerptsByTarget = { ...linkedWaypoints, ...linkedCode }
      if (cancelled) return

      /*
       * A finding's marks take the colour of its badge, and the cards inside it
       * inherit it: a bug's trace is red down to its last line step. Computed
       * over the whole run of waypoints, because inheritance is by depth and a
       * step cannot see the one above it on its own.
       */
      const kinds = inheritedKinds(sections)
      /*
       * What each parent waypoint points at, taken from its children.
       *
       * Computed over the whole list because a waypoint cannot answer it alone:
       * what it shows depends on the waypoints after it and how deep they are.
       */
      const outlines = outlineMarks(
        sections.map((step) => ({
          level: step.level,
          path: step.code?.reference?.path ?? "",
          marks: step.code?.marks ?? [],
        })),
      )
      /*
       * The window each waypoint renders in, decided over all of them at once.
       *
       * A run of waypoints on one file shares a panel, and a panel shows one
       * slice — so the slice is chosen here, where every waypoint's file and
       * range are in hand, rather than inside the highlighting of one of them.
       *
       * The focus is repaired first, because a window is placed around where
       * the code is now, and an anchored range that has moved would otherwise
       * pull the shared window to where it used to be.
       */
      const windows = sharedWindows(
        sections.map((step): WindowedStep => {
          const reference = step.code?.reference ?? null
          const path = reference?.path ?? null
          const file = path === null ? undefined : files.get(path)
          const text = file === undefined || "error" in file ? null : file.text
          const lines = text === null ? [] : fileLines(text)

          let focus = reference?.focus ?? null
          const anchor = step.code?.anchor ?? null
          if (focus !== null && anchor !== null && lines.length > 0) {
            const repair = repairRange(lines, focus, anchor)
            if (repair.state === "repaired") focus = repair.focus
          }

          return {
            path,
            focus,
            proposal: (step.code?.proposal ?? null) !== null,
            total: lines.length,
          }
        }),
      )

      const prepared = await Promise.all(
        sections.map(async (step, index) =>
          prepareCode(
            step,
            files,
            theme,
            blank,
            changes,
            markColorFor(kinds[index] ?? null),
            outlines[index] ?? [],
            windows[index] ?? null,
          ),
        ),
      )
      /*
       * The fixed panel for any card that proposes one, beside the real one.
       *
       * Almost always a list of nulls: a solution is rare, and highlighting one
       * costs nothing when there is none to highlight.
       */
      const fixes = await Promise.all(
        sections.map(async (step, index) =>
          prepareFix(step, files, theme, markColorFor(kinds[index] ?? null)),
        ),
      )
      if (cancelled) return

      /*
       * The diagram's excerpts and a code panel per node, before the blocks are
       * built, because highlighting is async and the block mapping is not.
       */
      const bands = [...view.lead, ...view.intro]
      const diagramExcerpts = new Map<BandBlock, DiagramExcerpts>()
      const panels: NodePanel[] = []
      for (const block of bands) {
        if (block.kind !== "diagram") continue
        const nodes = checkDiagram(block.diagram).diagram?.nodes ?? []
        const excerpts = prepareExcerpts(nodes, files, links, at, openable ?? [])
        diagramExcerpts.set(block, excerpts)
        /*
         * A code panel per node, so a card the waypoints never mention shows
         * its code the way a card they do mention shows its own.
         *
         * Only the first source, because that is the one a click resolves to
         * and a card with two is rare.
         */
        for (const node of nodes) {
          const source = node.sources?.[0]
          if (source === undefined) continue
          const panel = await nodePanelFor(source, files, theme, changes, links)
          if (panel === null) continue
          // The repaired range, not the recorded one: the excerpt already
          // followed the anchor, and a reference to lines that have moved is
          // worse than none.
          const excerpt = excerpts[node.id]?.[0]
          const range =
            excerpt?.from === undefined || excerpt.to === undefined
              ? null
              : { from: excerpt.from, to: excerpt.to }
          panels.push({
            id: node.id,
            label: node.label,
            sublabel: node.sublabel,
            description: node.description,
            annotation: annotationFor(source.path, range, at),
            source: sourceTarget(
              node.changed === true,
              links,
              at,
              openable ?? [],
              source.path,
              range,
            ),
            ...panel,
          })
        }
      }
      if (cancelled) return

      const band = (block: BandBlock): PreparedBlock => {
        if (block.kind === "blast") {
          const { blast, problems } = checkBlast(block.blast)
          return { kind: "blast", level: block.level, blast, problems }
        }
        if (block.kind === "diagram") {
          const { diagram, problems } = checkDiagram(block.diagram)
          return {
            kind: "diagram",
            level: block.level,
            diagram,
            problems,
            excerpts: diagramExcerpts.get(block) ?? {},
          }
        }
        return { kind: "prose", html: block.html, level: block.level }
      }

      const steps = sections.map((step, index): PreparedStep => {
        const resolved = prepared[index] ?? blank
        const fix = fixes[index] ?? null
        const path = resolved.path === "" ? null : resolved.path
        return {
          id: step.id,
          title: step.title,
          badge: step.badge,
          prose: step.prose,
          ...(step.needsAttention === undefined ? {} : { needsAttention: step.needsAttention }),
          ...(step.findings === undefined ? {} : { findings: step.findings }),
          ...(fix === null
            ? {}
            : { fixed: { code: fix.code, fileNumbers: fix.numbers, fileStart: fix.startLine } }),
          code: resolved.code,
          filePath: path,
          fileStart: resolved.startLine,
          fileNumbers: resolved.numbers,
          proposed: resolved.proposed,
          windowed: resolved.windowed,
          anchor: resolved.anchor,
          shifted: resolved.shifted,
          fileLink: linkFor(links, path, citedRange(step.code)),
          open: openFor(links, openable ?? [], path, citedRange(step.code)),
          annotation: path === null ? undefined : annotationFor(path, citedRange(step.code), at),
        }
      })

      setNodePanels(panels)
      setLinkExcerpts(excerptsByTarget)
      setLayout({
        lead: view.lead.map(band),
        intro: view.intro.map(band),
        sections: view.sections,
        steps,
      })
    }

    prepare().catch((cause: unknown) => {
      if (!cancelled) setError(String(cause))
    })

    return () => {
      cancelled = true
    }
    /*
     * `at` belongs here: the effect hands it to `annotationFor` and
     * `excerptTarget`, so a change of repository or commit changes every
     * reference this builds. Every caller has to pass stable objects; an
     * object literal here would re-read and re-highlight the whole document on
     * every render.
     */
  }, [document, theme, planRef, toolHint, host, links, openable, at])

  if (error !== null) return <div className="fp-message">{error}</div>
  if (layout === null) return <div className="fp-message">Preparing…</div>

  return (
    <RendererHostProvider value={host}>
      {drafting ? (
        /*
         * Says the document is still being written.
         *
         * Without it a reader cannot tell a half-written walkthrough from a
         * finished one, and the difference matters: in a finished document a
         * missing section is an omission worth asking about, and in this one it
         * is simply the next thing to arrive.
         */
        <div className="fp-drafting" role="status">
          <span className="fp-drafting-dot" aria-hidden="true" />
          Still being written — more sections will appear as they are added.
        </div>
      ) : null}
      <Scrollycoding
        layout={layout}
        {...(review === undefined ? {} : { review })}
        codeLinks={linkExcerpts}
        planRef={planRef}
        toolHint={toolHint}
        codeColumnWidth={DEFAULT_CODE_WIDTH}
        nodePanels={nodePanels}
        qualify={
          at == null ? null : { ...at, unlessLocal: openable ?? [] }
        }
        lineNumbers
        wordWrap
        onCodeColumnWidthChange={() => {
          // No host remembers a width: the column is not resizable any more.
        }}
      />
    </RendererHostProvider>
  )
}
