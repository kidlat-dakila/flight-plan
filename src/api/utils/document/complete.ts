import { blastProblems, checkBlast } from "../../../lib/schemas/diagram/blast"
import type { ResolveFinding } from "./resolve"
import type { StoredDocument, StoredWaypoint } from "../../../lib/schemas/document/stored"
import { worklistOf, type Work, type WorkKind } from "./worklist"

/**
 * What a finished document must have, checked only when one claims to be.
 *
 * These are the rules that a document *being written* necessarily breaks. A
 * walkthrough with its context section and nothing else has no waypoints, no
 * Overview and no diagram, and every one of those is a real requirement — but
 * refusing it would mean nothing could be stored until it was finished, and the
 * point of storing it early is that somebody can start reading while the rest
 * arrives.
 *
 * So they run at one moment: when an agent says the document is done. That is
 * also why an agent has to say it rather than it being inferred from the last
 * write — "done" is a claim somebody makes, and this is what checks the claim.
 *
 * The shape rules live in `./schema` and the relational ones in `./check`, and
 * both of those hold at every write. Nothing here duplicates either.
 */

/**
 * What a scaffold writes where prose will go.
 *
 * One marker rather than a plausible sentence per card. A scaffold that guessed
 * at readings would produce a document that passes every check and says
 * nothing, which is worse than one that refuses to finish — so the marker is
 * deliberately not a sentence anybody would write, and finding it here is a
 * card the agent never came back to.
 *
 * Lives beside the check that refuses it rather than beside the code that
 * writes it: the writer is a separate bundle, and a marker the checker did not
 * know would be a marker that does nothing.
 */
/**
 * What an unwritten reading was, before it became `null`.
 *
 * Kept so a document stored by an older build still reads as unwritten rather
 * than as a card whose reading says "Not written yet." to the reader.
 */
export const NOT_WRITTEN = "Not written yet."

const error = (at: string, message: string): ResolveFinding => ({
  severity: "error",
  at,
  message,
})

const warning = (at: string, message: string): ResolveFinding => ({
  severity: "warning",
  at,
  message,
})

/** Every waypoint in the tour, however deep. */
function* walk(points: readonly StoredWaypoint[]): Generator<StoredWaypoint> {
  for (const point of points) {
    yield point
    if (point.children !== undefined) yield* walk(point.children)
  }
}

export function checkComplete(doc: StoredDocument): ResolveFinding[] {
  const findings: ResolveFinding[] = []
  const kind = doc.meta.kind

  /*
   * Cards a scaffold made and nobody wrote, and the pieces nobody added.
   *
   * The whole argument for scaffolding is that the structure is derived so the
   * agent can spend its attention on prose. A document finished with the prose
   * still missing is that bargain not being kept, and it is the one failure the
   * scaffold makes *easier* to reach — every card already exists and looks
   * plausible, so an agent that stopped early leaves something that reads like
   * an omission rather than like a mistake.
   *
   * Grouped from `worklistOf` rather than computed here. The read surface
   * pages through the same array, so "what is left" cannot mean one thing to
   * the tool that hands out work and another to the gate that refuses it —
   * a drift whose symptom is an agent being told it is finished by the tool
   * whose whole job is to know.
   */
  const work = worklistOf(doc, kind)
  const listed = (kinds: readonly WorkKind[]): Work[] =>
    work.filter((one) => kinds.includes(one.needs) && one.id !== undefined)

  const named = (items: readonly Work[]): string => {
    const ids = items.map((one) => one.id ?? "")
    return `${ids.slice(0, 8).join(", ")}${ids.length > 8 ? ", …" : ""}`
  }

  const unwritten = listed(["reading"])
  if (unwritten.length > 0) {
    findings.push(
      error(
        "codeWalkthrough",
        `${String(unwritten.length)} scaffolded waypoint${unwritten.length === 1 ? " has" : "s have"} no reading yet: ${named(unwritten)}. Write ${unwritten.length === 1 ? "it" : "them"} with update-nodes.`,
      ),
    )
  }

  const undertitled = listed(["title"])
  if (undertitled.length > 0) {
    findings.push(
      error(
        "codeWalkthrough",
        `${String(undertitled.length)} scaffolded waypoint${undertitled.length === 1 ? " still has the title" : "s still have the titles"} the scaffold wrote: ${named(undertitled)}. A title says why the reader is being shown the code, not which code it is. Write ${undertitled.length === 1 ? "it" : "them"} with update-nodes.`,
      ),
    )
  }

  const unlabelled = listed(["label"])
  if (unlabelled.length > 0) {
    findings.push(
      error(
        "diagram",
        `${String(unlabelled.length)} diagram node${unlabelled.length === 1 ? " still has the label" : "s still have the labels"} the scaffold wrote: ${named(unlabelled)}. A label says what the code does, not which code it is — the identifier is already in \`sublabel\`. Write ${unlabelled.length === 1 ? "it" : "them"} with update-nodes.`,
      ),
    )
  }

  const open = listed(["answer"])
  if (open.length > 0) {
    findings.push(
      error(
        "diagram",
        `${String(open.length)} call${open.length === 1 ? "" : "s"} could not be resolved and ${open.length === 1 ? "has" : "have"} not been answered: ${named(open)}. Read the code and answer each with update-nodes — name what it reaches, or say it is decided at runtime and what decides it. A call left unanswered is not on the board at all.`,
      ),
    )
  }

  /*
   * The pieces a finished document needs that are not cards.
   *
   * The two indexes into the tour, the sections, and the entry point. Same
   * array as the readings above, so the worklist and the gate stay one
   * question: an agent that empties the list has nothing left here either.
   */
  for (const one of work) {
    if (one.id !== undefined) continue
    findings.push(error(one.at, one.message))
  }

  const files = doc.codeWalkthrough.files

  /*
   * The map.
   *
   * A warning rather than a refusal, because a document without one still
   * reads. It is worth saying every time, though, because the failure is
   * invisible from the author's side: nothing looks wrong, and the reader is
   * left holding the shape of the change in their head.
   */
  const diagram = doc.diagram as { absent?: unknown } | null
  if (diagram === null || diagram === undefined) {
    findings.push(
      warning(
        "diagram",
        "no diagram. Draw one, or say why there is no flow to draw with { \"absent\": \"…\" } — an absent section is only a question, where one line saying why is an answer.",
      ),
    )
  }

  /*
   * Every waypoint shows something.
   *
   * A waypoint with no code is a paragraph with an empty panel beside it. It is
   * a warning because the paragraph may still be worth reading, and because
   * refusing it would be the schema's job if it were absolute.
   */
  for (const file of files) {
    for (const point of walk(file.waypoints)) {
      if (point.code !== null) continue
      findings.push(
        warning(
          `waypoint \`${point.id}\``,
          `"${point.title}" has no code, so the panel beside it stays empty.`,
        ),
      )
    }
  }

  /*
   * Every bug, risk and nit says what the lines should be instead.
   *
   * A finding that names a problem and leaves the fix to the reader hands them
   * the half of the work the agent had already done, since it read the lines.
   * Here rather than in the schema, because a finding is often written before
   * its fix and a document is stored while it is being written.
   *
   * Two cases carry none, and `./check` refuses one on them at every write: a
   * `question`, which is not a claim, and a finding with no existing lines to
   * replace — a card with no code, a proposal, a document finding with none.
   */
  const unfixed: string[] = []
  const needsFix = (
    found: { id: string; kind: string; solution?: unknown },
    host: StoredWaypoint["code"],
  ): void => {
    if (found.kind === "question" || found.solution !== undefined) return
    if (host === null || host.kind === "proposal") return
    unfixed.push(found.id)
  }
  for (const file of files) {
    for (const point of walk(file.waypoints)) {
      for (const found of point.findings ?? []) needsFix(found, point.code)
    }
  }
  for (const found of doc.findings ?? []) needsFix(found, found.code)
  if (unfixed.length > 0) {
    const ids = `${unfixed.slice(0, 8).join(", ")}${unfixed.length > 8 ? ", …" : ""}`
    findings.push(
      error(
        "findings",
        `${String(unfixed.length)} finding${unfixed.length === 1 ? " has" : "s have"} no solution: ${ids}. Every bug, risk and nit carries one: \`{ lang, body }\`, the lines its code covers as they should be. Write ${unfixed.length === 1 ? "it" : "them"} with update-nodes for a waypoint's findings, update-document for the document's.`,
      ),
    )
  }

  /*
   * The blast radius, when the document has one.
   *
   * Errors where the diagram slot above is a warning, and the asymmetry follows
   * from what each omission costs a reader. A missing diagram leaves them
   * holding the shape of the change in their head. An unassessed blast node is a
   * dependent nobody looked at, sitting on a board whose entire claim is that
   * everything is accounted for — a board that is confidently wrong rather than
   * merely thin.
   *
   * Nothing is checked when there is no blast. Not walking one is a choice, and
   * the slot is optional for exactly that reason.
   *
   * This is the one place `document/` imports `diagram/`, against the
   * duck-typing every other diagram check here uses. The convention was
   * considered: it exists because reading three fields off a node is cheaper
   * than a full parse. It does not survive here, because the gate turns on
   * graph reachability — which node is shielded by which stop — and a
   * structural copy of that would be a second implementation of the derivation,
   * the thing `worklistOf` warns about two files over.
   */
  const walked = doc.blast as { absent?: unknown } | null | undefined
  if (walked !== undefined && walked !== null && walked.absent === undefined) {
    const { blast, problems } = checkBlast(doc.blast)
    for (const problem of problems) findings.push(error("blast", problem.message))
    for (const problem of blast === null ? [] : blastProblems(blast)) {
      findings.push(error("blast", problem.message))
    }
  }

  return findings
}


