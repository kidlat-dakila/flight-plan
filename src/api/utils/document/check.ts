import type { ResolveFinding } from "./resolve"
import type { StoredDocument, StoredWaypoint } from "../../../lib/schemas/document/stored"

/**
 * The checks a schema cannot express.
 *
 * Zod answers "is this field one of these four strings". It cannot answer "does
 * this id name a waypoint declared elsewhere in the same document", and that
 * second question is where the real mistakes live: a link to a renamed
 * waypoint, an id used twice, a tour that sends the reader back up the file.
 *
 * All of it runs at commit, never per piece. A half-built document has no
 * waypoints yet, so every one of these would fire on a document that is merely
 * unfinished.
 */

const error = (at: string, message: string): ResolveFinding => ({
  severity: "error",
  at,
  message,
})

/** Every waypoint under `points`, depth first, with the path that reaches it. */
function* walk(
  points: readonly StoredWaypoint[],
  at: string,
): Generator<{ point: StoredWaypoint; at: string }> {
  for (const [index, point] of points.entries()) {
    const here = `${at}[${String(index)}]`
    yield { point, at: here }
    if (point.children !== undefined) yield* walk(point.children, `${here}.children`)
  }
}

/**
 * Every waypoint in the document.
 *
 * The tour, and only the tour. A finding's solution used to be waypoints of its
 * own and was walked here too; it is one replacement for one card's lines now,
 * so there is nothing under a finding to walk.
 */
export function* everyWaypoint(
  doc: StoredDocument,
): Generator<{ point: StoredWaypoint; at: string }> {
  for (const [index, file] of doc.codeWalkthrough.files.entries()) {
    yield* walk(file.waypoints, `codeWalkthrough.files[${String(index)}].waypoints`)
  }
}

/**
 * Every id declared in the document, and where.
 *
 * One namespace for waypoints and findings both, the nested findings included:
 * an id is what a reference points at, and two things answering to one id is
 * the ambiguity this exists to catch wherever the two happen to live.
 */
export function idsIn(doc: StoredDocument): Map<string, string> {
  const ids = new Map<string, string>()
  for (const { point, at } of everyWaypoint(doc)) {
    if (!ids.has(point.id)) ids.set(point.id, at)
    for (const [index, found] of (point.findings ?? []).entries()) {
      if (!ids.has(found.id)) ids.set(found.id, `${at}.findings[${String(index)}]`)
    }
  }
  for (const [index, found] of (doc.findings ?? []).entries()) {
    if (!ids.has(found.id)) ids.set(found.id, `findings[${String(index)}]`)
  }
  return ids
}

export function checkDocument(doc: StoredDocument): ResolveFinding[] {
  const findings: ResolveFinding[] = []

  /*
   * Ids first, because every other check leans on them.
   *
   * Unique across the whole document, not merely among siblings: a `see` names
   * one id and has no way to say which of two it meant.
   */
  const ids = new Map<string, string>()
  const claim = (id: string, at: string): void => {
    const first = ids.get(id)
    if (first !== undefined) {
      findings.push(
        error(at, `id \`${id}\` is used more than once; it is already at \`${first}\`.`),
      )
      return
    }
    ids.set(id, at)
  }
  for (const { point, at } of everyWaypoint(doc)) claim(point.id, at)
  for (const [index, found] of (doc.findings ?? []).entries()) {
    claim(found.id, `findings[${String(index)}]`)
  }

  /*
   * Where the link check used to be.
   *
   * It moved to `checkComplete`, and the reason is the order a document is
   * written in: the overview names the waypoints that produce each outcome, and
   * an author writes the overview before the tour it indexes. Refusing a link
   * to a waypoint that has not been written yet would make building a document
   * in pieces impossible, in exactly the order the format asks for.
   *
   * Everything left here is true of a document at every moment of its life.
   */

  /*
   * Marks never go backwards within one file's section.
   *
   * Per section, because line numbers restart with every file. This is what
   * makes "a tour reads top to bottom" checkable: a block whose lines straddle
   * another block is two blocks, and a card marking both would send the reader
   * up the file and then back down it, taking the code panel with them.
   */
  for (const [index, file] of doc.codeWalkthrough.files.entries()) {
    let lowest = 0
    for (const { point, at } of walk(
      file.waypoints,
      `codeWalkthrough.files[${String(index)}].waypoints`,
    )) {
      const first = point.code?.marks?.[0]
      if (first === undefined) continue
      if (first.from < lowest) {
        findings.push(
          error(
            `${at}.code.marks`,
            `marks start at line ${String(first.from)}, before line ${String(lowest)}, where an earlier waypoint in this file starts. A tour reads top to bottom and so does the code it points at.`,
          ),
        )
      }
      lowest = Math.max(lowest, first.from)
    }
  }

  /*
   * Which fence kind belongs where.
   *
   * A walkthrough references code that exists; the one exception is the fix
   * under a finding, which is by definition code nobody has written, and which
   * this loop therefore does not visit. A plan is all proposal.
   */
  const wantsProposal = doc.meta.kind === "plan"
  for (const [index, file] of doc.codeWalkthrough.files.entries()) {
    for (const { point, at } of walk(
      file.waypoints,
      `codeWalkthrough.files[${String(index)}].waypoints`,
    )) {
      if (point.code === null) continue
      const isProposal = point.code.kind === "proposal"
      if (isProposal && !wantsProposal) {
        findings.push(
          error(
            `${at}.code`,
            `this fence proposes code, which a ${doc.meta.kind} does not do. Use a reference. A suggested fix goes in a finding's solution, which is a replacement rather than a fence.`,
          ),
        )
      }
      if (!isProposal && wantsProposal) {
        findings.push(
          error(
            `${at}.code`,
            "a plan proposes code rather than referencing it. Use a proposal fence with a position.",
          ),
        )
      }
    }
  }

  /*
   * A solution replaces the lines its card is about, so there have to be some.
   *
   * The position is implied rather than written — that is what makes a fix
   * previewable without naming a file or a range — which means the host card
   * has to carry a reference for it to be implied *from*. A card with no code
   * has no lines to replace, and a card whose fence proposes code is proposing
   * it already: a fix for code nobody has written is just different code.
   *
   * A document finding has no card, so its own `code` is the host.
   */
  const hostless = (
    id: string,
    code: StoredWaypoint["code"],
    where: string,
    noCode: string,
  ): void => {
    if (code === null) {
      findings.push(error(where, `\`${id}\` proposes a fix, but ${noCode}`))
    } else if (code.kind === "proposal") {
      findings.push(
        error(
          where,
          `\`${id}\` proposes a fix for code that does not exist yet. A proposal is already the code being suggested; say it differently rather than fixing it.`,
        ),
      )
    }
  }
  for (const { point, at } of everyWaypoint(doc)) {
    for (const [index, found] of (point.findings ?? []).entries()) {
      if (found.solution === undefined) continue
      hostless(
        found.id,
        point.code,
        `${at}.findings[${String(index)}].solution`,
        "the waypoint it is on shows no code, so there are no lines for it to replace. Put the fix in the finding's reading, or give the waypoint a reference.",
      )
    }
  }
  for (const [index, found] of (doc.findings ?? []).entries()) {
    if (found.solution === undefined) continue
    hostless(
      found.id,
      found.code,
      `findings[${String(index)}].solution`,
      "the finding names no code, so there are no lines for it to replace. Give the finding a reference to the lines the fix replaces, or put the fix in its reading.",
    )
  }

  /*
   * Two proposals at one position must carry one body.
   *
   * Identical bodies are expected: breaking a plan's waypoint down repeats the
   * parent's whole proposal and moves only the marks. Two *different* bodies
   * are a conflict — the plan says to write two different things in one place,
   * and whichever waypoint the reader acts on last wins.
   */
  const positions = new Map<string, { body: string; at: string }>()
  for (const { point, at } of everyWaypoint(doc)) {
    if (point.code === null || point.code.kind !== "proposal") continue
    const place = `${point.code.path}:${JSON.stringify(point.code.position)}`
    const seen = positions.get(place)
    if (seen === undefined) {
      positions.set(place, { body: point.code.body, at })
      continue
    }
    if (seen.body === point.code.body) continue
    findings.push(
      error(
        `${at}.code.body`,
        `a proposal at this position already exists at \`${seen.at}\` with a different body. Two edits at one place is a conflict; a breakdown repeats the body and moves only its marks.`,
      ),
    )
  }

  return findings
}
