/**
 * What a DOM selection is in: lines of a file, or prose.
 *
 * Code lines carry `data-fp-file-line`, and the panel carries its path in
 * `data-fp-file`, so a selection in code copies a path and a range. Prose
 * carries no lines — a JSON document has none — so a selection in any rendered
 * prose block is copied as the waypoint it sits in (`data-fp-node`) and the
 * quoted text (`buildAnnotationReference`).
 */

import { isHtmlElement } from "./dom"

export type LineSpan = {
  from: number
  to: number
  /**
   * Repository path, when the selection is inside referenced code.
   *
   * Present means the numbers are file lines and the reference should name the
   * file; absent means the selection is prose and the reference names the
   * waypoint and quotes the text. The distinction is carried, not guessed.
   */
  file?: string
}

function readNumber(value: string | undefined): number | null {
  if (value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function elementOf(node: Node | null): HTMLElement | null {
  if (node === null) return null
  if (isHtmlElement(node)) return node
  return node.parentElement
}

/**
 * The waypoint a node sits inside, or null when it sits outside every one.
 *
 * Walks to the nearest `data-fp-node`, which `HostMarkdown` writes for prose
 * that belongs to a waypoint. Null for the document's own prose — the context
 * section, an overview — which belongs to no waypoint and is named by the
 * document itself.
 */
export function nodeOf(node: Node | null): string | null {
  let element = elementOf(node)
  while (element !== null) {
    const found = element.dataset["fpNode"]
    if (found !== undefined && found !== "") return found
    element = element.parentElement
  }
  return null
}

/** The span of the nearest annotated ancestor, or null when there is none. */
export function spanOfNode(node: Node | null): LineSpan | null {
  let element = elementOf(node)
  let span: LineSpan | null = null

  // The walk does not stop at the first line anchor. Referenced code carries
  // its path on the panel rather than on every line, so once the lines are
  // known the walk continues far enough to find out which file they are in.
  while (element !== null) {
    if (span === null) {
      const fileLine = readNumber(element.dataset["fpFileLine"])
      if (fileLine !== null) span = { from: fileLine, to: fileLine }
      /*
       * Prose: any rendered prose block. It has no lines worth naming — a
       * reference to prose names the waypoint it is in and quotes the text —
       * so the numbers are zero and only mark that there is something to copy.
       */
      else if (element.classList.contains("fp-markdown")) span = { from: 0, to: 0 }
    }

    const file = element.dataset["fpFile"]
    if (span !== null && file !== undefined && file !== "") {
      return { ...span, file }
    }

    element = element.parentElement
  }
  return span
}

/** The span covering both ends of a range. */
export function spanOfRange(range: Range): LineSpan | null {
  const start = spanOfNode(range.startContainer)
  const end = spanOfNode(range.endContainer)
  if (start === null && end === null) return null

  const first = start ?? end
  const second = end ?? start
  if (first === null || second === null) return null

  const file = first.file ?? second.file
  const span: LineSpan = {
    from: Math.min(first.from, second.from),
    to: Math.max(first.to, second.to),
  }
  return file === undefined ? span : { ...span, file }
}
