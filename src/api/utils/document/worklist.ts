import { blastWork, checkBlast } from "../../../lib/schemas/diagram/blast"
import type { StoredDocument, StoredWaypoint } from "../../../lib/schemas/document/stored"

/**
 * What is left to write, computed once and asked twice.
 *
 * The gate and the worklist are the same question at two moments — "what is
 * missing?" asked by `complete` when an agent claims to be finished, and asked
 * by the read surface while it is still working. Two implementations of one
 * question drift, and the drift has a direction: the worklist says nothing is
 * left, the gate refuses, and the agent is told it is done by the tool whose
 * job is to know.
 *
 * So `checkComplete` builds its prose findings from this, and the read surface
 * pages through the same array. Neither computes it again.
 *
 * **Structural requirements are in here too**, not only the fillable cards. An
 * entry point nobody added and an overview nobody wrote are work the agent
 * still owes; leaving them out of the worklist is what makes them invisible
 * until the refusal.
 */

/** What a piece of work needs, which is also which tool writes it. */
export const WORK_KINDS = [
  "reading",
  "title",
  /** A diagram node still carrying the declaration name the scaffold wrote. */
  "label",
  /** A blast-radius use nobody could prove, awaiting an answer. */
  "answer",
  /** A blast-radius node nobody has said what the change does to. */
  "verdict",
  /** A changed declaration that has not stated its surface, before and after. */
  "contract",
  "overview",
  "implementation",
  "waypoints",
  "section",
] as const

export type WorkKind = (typeof WORK_KINDS)[number]

export type Work = {
  /** The card, node or call this is about. Absent for a document-wide gap. */
  id?: string
  /** Where it sits, in the shape the document stores. */
  at: string
  needs: WorkKind
  /** What to do about it, addressed to whoever has to act. */
  message: string
}

/** What a scaffold used to write where prose would go. See `./complete`. */
const WAS_UNWRITTEN = "Not written yet."

/** Every waypoint in the tour, however deep. */
function* walk(points: readonly StoredWaypoint[]): Generator<StoredWaypoint> {
  for (const point of points) {
    yield point
    if (point.children !== undefined) yield* walk(point.children)
  }
}

/** Every node in a diagram, however deeply nested, without parsing it fully. */
export function nodesIn(diagram: unknown): { id: string; draft: boolean }[] {
  const found: { id: string; draft: boolean }[] = []
  const walkNodes = (nodes: unknown): void => {
    if (!Array.isArray(nodes)) return
    for (const raw of nodes) {
      if (typeof raw !== "object" || raw === null) continue
      const node = raw as {
        id?: unknown
        draft?: unknown
        children?: unknown
      }
      if (typeof node.id === "string") {
        found.push({ id: node.id, draft: node.draft === true })
      }
      walkNodes(node.children)
    }
  }
  if (typeof diagram === "object" && diagram !== null) {
    walkNodes((diagram as { nodes?: unknown }).nodes)
  }
  return found
}

/**
 * Everything still owed on a document, in the order it is worth doing.
 *
 * Readings first, because they are the bulk and the reason the scaffold
 * exists. Then the titles and labels the scaffold guessed at, then the
 * questions only a reader of the code can answer, then the document-wide
 * pieces. An agent working the list from the top writes prose until it runs
 * out and only then thinks about structure.
 */
export function worklistOf(doc: StoredDocument, kind: string): Work[] {
  const work: Work[] = []

  /*
   * The blast radius first, ahead of every reading and every label.
   *
   * Not an arbitrary ordering. An agent that writes the overview before it knows
   * how far the change reaches is writing about a diff, and the difference
   * between a two-file change and a two-hundred-file one is the single most
   * useful thing anybody can know before describing it. So the reach is
   * assessed, and then the prose is written by somebody who knows the answer.
   *
   * It also fails cheapest here. An unproven use may add a whole subtree, and a
   * subtree that arrives after the tour is written is a tour written against the
   * wrong change.
   */
  const walked = doc.blast as { absent?: unknown } | null | undefined
  if (walked !== undefined && walked !== null && walked.absent === undefined) {
    const { blast } = checkBlast(doc.blast)
    for (const item of blast === null ? [] : blastWork(blast)) {
      work.push({ id: item.id, at: "blast", needs: item.needs, message: item.message })
    }
  }
  const points = [...walk(doc.codeWalkthrough.files.flatMap((file) => file.waypoints))]

  for (const point of points) {
    if (point.reading !== null && point.reading !== WAS_UNWRITTEN) continue
    work.push({
      id: point.id,
      at: "codeWalkthrough",
      needs: "reading",
      message: `\`${point.id}\` has no reading. Say why the reader is being shown this code.`,
    })
  }

  for (const point of points) {
    if (point.draft !== true) continue
    work.push({
      id: point.id,
      at: "codeWalkthrough",
      needs: "title",
      message: `\`${point.id}\` still has the title the scaffold wrote. A title says why the reader is being shown the code, not which code it is.`,
    })
  }

  /*
   * The labels the scaffold guessed at, beside the titles it guessed at.
   *
   * A scaffolded node label is the declaration name, which is what `sublabel`
   * is for — the label is meant to say what the code does. Untracked, a board
   * of raw identifiers passed the gate and shipped, and the failure was
   * invisible from the author's side: every card had a label, and every label
   * was code.
   */
  for (const node of nodesIn(doc.diagram)) {
    if (!node.draft) continue
    work.push({
      id: node.id,
      at: "diagram",
      needs: "label",
      message: `\`${node.id}\` still has the label the scaffold wrote. A label says what the code does; the identifier belongs in \`sublabel\`.`,
    })
  }

  /* The document-wide pieces. */
  if (doc.contextBody.overview === undefined) {
    work.push({
      at: "contextBody.overview",
      needs: "overview",
      message: `a finished ${kind} needs an overview: the scenarios that changed, as { when, then }.`,
    })
  }
  if (doc.contextBody.implementation === undefined) {
    work.push({
      at: "contextBody.implementation",
      needs: "implementation",
      message: `a finished ${kind} needs an implementation list: one group per place in the code, each item beginning with the verb.`,
    })
  }

  if (doc.codeWalkthrough.files.length === 0) {
    work.push({
      at: "codeWalkthrough.files",
      needs: "section",
      message: `a finished ${kind} needs at least one file section. A document with no tour is a summary.`,
    })
  }

  for (const file of doc.codeWalkthrough.files) {
    if (file.waypoints.length > 0) continue
    work.push({
      at: "codeWalkthrough",
      needs: "waypoints",
      message: `\`${file.path}\` has no waypoints. Either write them or drop the section: a file named with nothing under it tells a reader something is missing without saying what.`,
    })
  }

  return work
}

/** How much of each kind is left, for a caller that wants the shape not the list. */
export function tallyOf(work: readonly Work[]): Record<WorkKind, number> {
  const tally = Object.fromEntries(WORK_KINDS.map((kind) => [kind, 0])) as Record<
    WorkKind,
    number
  >
  for (const one of work) tally[one.needs] += 1
  return tally
}
