import type { FindingKind, Solution, WaypointFinding } from "../../lib/schemas/document/schema"
import type { StoredDocument, StoredFence, StoredWaypoint } from "../../lib/schemas/document/stored"
import type { LineRange } from "../../lib/schemas/document/primitives"
import { escapeHtml, renderInline, renderMarkdown } from "../markdown"

/**
 * A stored document, laid out for the renderer.
 *
 * The structure comes from the JSON and nothing else. The headings, the
 * Overview's When/Then list, the Implementation Overview, the file sections
 * and the findings are built here as HTML around the prose, and only the
 * prose fields an agent writes go through Markdown (`../markdown`). The
 * document is never written out as Markdown and parsed back to find its
 * shape, which is what this replaced (`toNote`, the heading outline).
 *
 * The HTML is what the Markdown renderer produced for the old Markdown form,
 * element for element, so the panel looks the same.
 */

export type CodeReference = {
  /** Repository-relative POSIX path, for example `src/panel.ts`. */
  path: string
  /**
   * The range to focus, or null to show the file without focusing anything.
   * Focusing is not cropping: the rest of the file still renders, dimmed.
   */
  focus: LineRange | null
}

export type ProposalAt =
  | { kind: "after"; line: number }
  | { kind: "before"; line: number }
  | { kind: "replace"; from: number; to: number }
  /** The file does not exist yet, so the body is all of it. */
  | { kind: "new" }

export type Proposal = {
  path: string
  at: ProposalAt
  /** Text expected at the position, so it survives the file changing above. */
  anchor: string | null
}

/** A waypoint's code: a range of a file, or code that does not exist yet. */
export type ViewFence = {
  lang: string
  /** The proposed code. Empty for a reference. */
  body: string
  /** The file this fence names, or null for a proposal. */
  reference: CodeReference | null
  /** Lines to mark, in file line numbers. */
  marks: LineRange[]
  /** Text expected on the range's first line, used to repair a moved range. */
  anchor: string | null
  /** Set when the fence proposes code that does not exist yet. */
  proposal: Proposal | null
}

/** Prose to render: an agent's Markdown field, or HTML built around one. */
export type Prose = { markdown: string } | { html: string }

/** One card of the tour: a waypoint, or a document-level finding. */
export type ViewStep = {
  id: string
  title: string
  /** Nesting depth, as a heading level: 3 for a waypoint, 4 for its child. */
  level: number
  /**
   * The kind of a document-level finding, which is drawn as a card of its
   * own. Null for a waypoint, whose findings are in `findings`.
   */
  badge: FindingKind | null
  prose: Prose
  needsAttention?: string
  findings?: readonly WaypointFinding[]
  /**
   * A document-level finding's fix, for its own `code`. Its own field rather
   * than a one-item `findings`, which would draw the card a second chip and
   * list the finding inside itself. A waypoint's fixes are in `findings`.
   */
  solution?: Solution
  code: ViewFence | null
}

/** A full-width block above or below the tour. */
export type BandBlock =
  | { kind: "prose"; html: string; level: number }
  | { kind: "diagram"; diagram: unknown; level: number }
  | { kind: "blast"; blast: unknown; level: number }

/** One file of the tour, or the findings. `steps` index `DocumentView.steps`. */
export type ViewSection = {
  /** The file's path, or "Findings". */
  key: string
  /** Whether the section is a file, which a reader can mark as reviewed. */
  file: boolean
  /**
   * The file's path, for a section with no waypoints. Empty otherwise: a
   * waypoint's panel names its file in its own header.
   */
  titleHtml: string
  /** The file's summary, as a list. Empty when there is none. */
  summaryHtml: string
  steps: number[]
}

export type DocumentView = {
  /** Title, context, overview, implementation, diagram, blast. */
  lead: BandBlock[]
  /** The tour's heading, where the filter sits, then its note when it has one. */
  intro: BandBlock[]
  sections: ViewSection[]
  /** Every card, in document order. */
  steps: ViewStep[]
}

/** The level of a block that belongs to the level-2 heading above it. */
const SECTION_BODY = 3

function heading(level: number, html: string): string {
  return `<h${String(level)}>${html}</h${String(level)}>\n`
}

function list(tag: "ul" | "ol", items: readonly string[]): string {
  return `<${tag}>\n${items.map((item) => `<li>${item}</li>\n`).join("")}</${tag}>\n`
}

/** `code.expect` becomes `anchor`, the string `repairRange` reads. */
export function fenceOf(code: StoredFence | null): ViewFence | null {
  if (code === null) return null
  const marks = code.marks ?? []
  const anchor = code.expect ?? null
  if (code.kind === "proposal") {
    const position = code.position
    return {
      lang: code.lang,
      body: code.body,
      reference: null,
      marks,
      anchor,
      proposal: {
        path: code.path,
        at:
          position.kind === "replace"
            ? { kind: "replace", from: position.lines.from, to: position.lines.to }
            : position.kind === "new"
              ? { kind: "new" }
              : { kind: position.kind, line: position.line },
        anchor,
      },
    }
  }
  return {
    lang: code.lang,
    body: "",
    reference: { path: code.path, focus: code.focus },
    marks,
    anchor,
    proposal: null,
  }
}

function summaryOf(summary: readonly string[]): string {
  return summary.length === 0 ? "" : list("ul", summary.map(renderInline))
}

/** A trace as the numbered list under a finding's reading. */
function traceHtml(trace: readonly string[]): string {
  return `<p><strong>Trigger trace</strong></p>\n${list("ol", trace.map(renderInline))}`
}

export function documentView(doc: StoredDocument): DocumentView {
  const lead: BandBlock[] = []
  const steps: ViewStep[] = []

  lead.push({ kind: "prose", html: heading(1, renderInline(doc.title)), level: 1 })
  lead.push({
    kind: "prose",
    html: heading(2, "Context") + renderMarkdown(doc.contextBody.context),
    level: 2,
  })

  const overview = doc.contextBody.overview ?? []
  if (overview.length > 0) {
    const items = overview.map(
      (one) =>
        `<strong>When</strong> ${renderInline(one.when)}\n${list("ul", [`<strong>Then</strong> ${renderInline(one.then)}`])}`,
    )
    lead.push({ kind: "prose", html: heading(2, "Overview") + list("ul", items), level: 2 })
  }

  const implementation = doc.contextBody.implementation ?? []
  if (implementation.length > 0) {
    const items = implementation.map((group) => {
      const label = `<strong><code>${escapeHtml(group.label)}</code></strong>`
      return group.items.length === 0
        ? label
        : `${label}\n${list("ul", group.items.map((item) => renderInline(item.text)))}`
    })
    lead.push({
      kind: "prose",
      html: heading(2, "Implementation Overview") + list("ul", items),
      level: 2,
    })
  }

  /*
   * The diagram section, present either way: a change with no flow to draw
   * still answers the question, so `absent` renders as the heading and the
   * reason.
   *
   * The block under the heading is one level deeper, because that is what a
   * heading's fold arrow folds (`ownedEnd` in `../collapsible`). At the same
   * level as its heading, the arrow on "Diagram" hid nothing.
   */
  lead.push({ kind: "prose", html: heading(2, "Diagram"), level: 2 })
  const diagram = doc.diagram as { absent?: unknown } | null
  if (diagram !== null && typeof diagram === "object" && typeof diagram.absent === "string") {
    if (diagram.absent.trim() !== "") {
      lead.push({ kind: "prose", html: renderMarkdown(diagram.absent), level: SECTION_BODY })
    }
  } else {
    lead.push({ kind: "diagram", diagram: doc.diagram, level: SECTION_BODY })
  }

  // The blast radius only when one was walked: a document without one is not
  // incomplete, nobody asked.
  const blast = doc.blast as { absent?: unknown } | null | undefined
  if (blast !== undefined && blast !== null) {
    lead.push({ kind: "prose", html: heading(2, "Blast Radius"), level: 2 })
    if (typeof blast === "object" && typeof blast.absent === "string") {
      if (blast.absent.trim() !== "") {
        lead.push({ kind: "prose", html: renderMarkdown(blast.absent), level: SECTION_BODY })
      }
    } else {
      lead.push({ kind: "blast", blast: doc.blast, level: SECTION_BODY })
    }
  }

  /*
   * The heading and the note are two blocks, because the heading is pinned
   * while the files scroll under it and the note is not: a paragraph in a
   * pinned bar would cover the code it introduces.
   */
  const note = doc.codeWalkthrough.note
  const intro: BandBlock[] = [{ kind: "prose", html: heading(2, "Code Walkthrough"), level: 2 }]
  if (note !== undefined) intro.push({ kind: "prose", html: renderMarkdown(note), level: SECTION_BODY })

  const waypoint = (point: StoredWaypoint, level: number): number[] => {
    const at = steps.length
    steps.push({
      id: point.id,
      title: point.title,
      level,
      badge: null,
      prose: { markdown: point.reading ?? "" },
      ...(point.needsAttention === undefined ? {} : { needsAttention: point.needsAttention }),
      ...(point.findings === undefined ? {} : { findings: point.findings }),
      code: fenceOf(point.code),
    })
    return [at, ...(point.children ?? []).flatMap((child) => waypoint(child, level + 1))]
  }

  const files = doc.codeWalkthrough.files.map((file) => ({
    key: file.path,
    file: true,
    // A section with no waypoints has no panel to name its file, so it says it.
    titleHtml: file.waypoints.length === 0 ? heading(2, `<code>${escapeHtml(file.path)}</code>`) : "",
    summaryHtml: summaryOf(file.summary),
    steps: file.waypoints.flatMap((point) => waypoint(point, 3)),
  }))

  const findings: ViewSection[] = []
  if (doc.findings !== undefined && doc.findings.length > 0) {
    const indices = doc.findings.map((found) => {
      const at = steps.length
      steps.push({
        id: found.id,
        title: found.title,
        level: 3,
        badge: found.kind,
        prose: {
          html: renderMarkdown(found.reading) + (found.trace === undefined ? "" : traceHtml(found.trace)),
        },
        ...(found.solution === undefined ? {} : { solution: found.solution }),
        code: fenceOf(found.code),
      })
      return at
    })
    findings.push({ key: "Findings", file: false, titleHtml: "", summaryHtml: "", steps: indices })
  }

  /*
   * Every file is a section of the tour, whether or not it has a waypoint
   * yet, and the tour has its heading as soon as the document has one. A
   * document still being written shows where the next section will arrive;
   * a file the author summarised and did not walk is still listed.
   */
  return { lead, intro, sections: [...files, ...findings], steps }
}

/** Every file a document's code cites, in first-named order: the files to read. */
export function referencedPaths(steps: readonly ViewStep[]): string[] {
  const seen = new Set<string>()
  for (const step of steps) {
    // A proposal's file is read too: its body only means something spliced in.
    const path = step.code?.reference?.path ?? step.code?.proposal?.path
    if (path !== undefined) seen.add(path)
  }
  return [...seen]
}

/** Every Markdown prose field of a document, for collecting its `code:` links. */
export function proseFields(doc: StoredDocument): string[] {
  const out: string[] = [doc.contextBody.context]
  for (const one of doc.contextBody.overview ?? []) out.push(one.when, one.then)
  for (const group of doc.contextBody.implementation ?? []) {
    for (const item of group.items) out.push(item.text)
  }
  if (doc.codeWalkthrough.note !== undefined) out.push(doc.codeWalkthrough.note)
  const visit = (point: StoredWaypoint): void => {
    if (point.reading !== null) out.push(point.reading)
    if (point.needsAttention !== undefined) out.push(point.needsAttention)
    for (const found of point.findings ?? []) out.push(found.reading, ...(found.trace ?? []))
    for (const child of point.children ?? []) visit(child)
  }
  for (const file of doc.codeWalkthrough.files) {
    out.push(...file.summary)
    for (const point of file.waypoints) visit(point)
  }
  for (const found of doc.findings ?? []) out.push(found.reading, ...(found.trace ?? []))
  const absent = (slot: unknown) =>
    slot !== null && typeof slot === "object" && typeof (slot as { absent?: unknown }).absent === "string"
      ? [(slot as { absent: string }).absent]
      : []
  out.push(...absent(doc.diagram), ...absent(doc.blast))
  return out
}
