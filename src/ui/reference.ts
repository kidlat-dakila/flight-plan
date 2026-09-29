import { mcpReference } from "../lib/schemas/reference"

/**
 * A reference to a piece of a document's prose.
 *
 * A JSON document has no lines of its own, so a reference by line number
 * pointed at nothing, and looked exactly like one that pointed at something.
 *
 * So it names what the document actually has: the waypoint's id, and the text
 * that was selected. The quote is what makes it verifiable — an assistant finds
 * it or says it is gone — and what makes it readable, which a line number was
 * not.
 */
export type AnnotationReferenceInput = {
  /** How the document is filed: `acme/storefront#412`. */
  subject: string
  /** The waypoint the selection sits in, or null for the document's own prose. */
  node: string | null
  /** The selected text. Trimmed and collapsed; long selections are cut. */
  text: string
  /** MCP tool name to suggest. No hint is emitted when empty. */
  toolHint: string
}

/** Longer than this and the quote stops being a quote and becomes the passage. */
const QUOTE_LIMIT = 120

export function buildAnnotationReference(input: AnnotationReferenceInput): string {
  const text = input.text.replace(/\s+/gu, " ").trim()
  const quote =
    text.length <= QUOTE_LIMIT ? text : `${text.slice(0, QUOTE_LIMIT).trimEnd()}…`

  const target = input.node === null ? input.subject : `${input.subject}@${input.node}`
  const head = mcpReference(target, input.toolHint)
  return quote === "" ? head : `${head} "${quote}"`
}

export type FileReferenceInput = {
  /** Repository-relative path of the file. */
  path: string
  /** First file line of the selection. */
  from: number
  /** Last file line of the selection, inclusive. */
  to: number
  /**
   * Repository and commit, when a bare path would not resolve.
   *
   * A bare `src/repo.ts#L19-34` assumes the assistant can read that file as it
   * stands, which holds only when the checkout is at the commit the walkthrough
   * describes. Reviewing a branch you have not checked out is exactly what this
   * tool is for, and there the bare form points an assistant at whatever
   * version happens to be on disk. Qualifying it says which bytes are meant.
   */
  at?: { repo: string; sha: string } | null
}

/**
 * Reference for a selected range of referenced source, for example
 * `src/panel.ts#L57-70`.
 *
 * No MCP tool hint here, unlike a document reference. The lines are real repository
 * lines, so an assistant sitting in that repository reads them with the file
 * tools it already has. Naming a tool would send it somewhere it does not need
 * to go. `#L` rather than `@L` because that is what GitHub links use, so the
 * same string pasted into a browser resolves.
 */
/**
 * The part of a reference before the line range.
 *
 * `owner/repo@sha:path`, the walkthrough's own qualified form, so an assistant
 * with no checkout can still fetch exactly the right bytes — or the bare path
 * when the reader and the assistant share a working tree.
 *
 * Exported because a reference to a *whole* file has no line range and would
 * otherwise have to rebuild this, leaving two places that decide what a
 * qualified path looks like.
 */
export function referenceSubject(
  path: string,
  at?: { repo: string; sha: string } | null,
): string {
  return at == null ? path : `${at.repo}@${at.sha}:${path}`
}

export function buildFileReference(input: FileReferenceInput): string {
  const from = Math.min(input.from, input.to)
  const to = Math.max(input.from, input.to)
  const lines = from === to ? `#L${from}` : `#L${from}-${to}`
  return `${referenceSubject(input.path, input.at)}${lines}`
}
