import {
  deriveVerdicts,
  type Blast,
  type BlastNode,
  type ChangeType,
} from "../../lib/schemas/diagram/blast"

/**
 * Writing into a blast radius, and nothing else.
 *
 * The agent's half, under the rule the scaffold already lives by: the structure
 * was measured from the diff and the call graph and is not the agent's to
 * change. Nothing here can add, remove or move a node or an edge, and the wrong
 * thing is unsayable rather than refused — there is no `hop` in an edit's shape,
 * no `path`, no `edges`, so a structural change cannot be expressed and
 * therefore cannot be argued about.
 *
 * What the agent *can* do is the half no walk can: say what the change means for
 * each node it reached. That is a reading of code, and reading code is the thing
 * the parser is not doing.
 *
 * There are no entries here and there will not be. An entry describes what
 * starts a trace, and a blast radius has no trace: it starts at the change,
 * which is already on the board.
 *
 * **An unknown id is refused, and nothing is applied.** An agent that invented
 * one has lost track of the document, and a partial apply would leave it unable
 * to tell which half of its call landed.
 */

export type BlastProseEdit = {
  id: string
  label?: string
  sublabel?: string
  tag?: string
  description?: string
}

export type BlastAssessment = {
  id: string
  /** On a dependent: what the change does to it, and the evidence. */
  changeType?: ChangeType
  effect?: string
  /** On the change itself: its surface, before and after. Refused elsewhere. */
  contract?: { before: string | null; now: string }
}

export type BlastAnswer = {
  id: string
  /** What the use actually reaches. The caller walks these. */
  targets?: { path: string; name: string }[]
  /** Why it cannot be known before the code runs. */
  runtime?: string
}

export type BlastFilled = {
  blast: Blast
  /** Ids the edit named that are not on the board. Non-empty means nothing was applied. */
  unknown: string[]
}

/** Ids in `edits` that name no node, which is the one failure worth refusing whole. */
function missing(blast: Blast, ids: readonly string[]): string[] {
  const known = new Set(blast.nodes.map((node) => node.id))
  return ids.filter((id) => !known.has(id))
}

/**
 * Labels, sublabels, tags and descriptions.
 *
 * Writing a label clears `draft` in the same call that replaces the text, for
 * the reason `fill.ts` gives: a gate that refuses a title somebody wrote is a
 * gate that gets switched off.
 */
export function fillBlastProse(
  blast: Blast,
  edits: readonly BlastProseEdit[],
): BlastFilled {
  const unknown = missing(blast, edits.map((edit) => edit.id))
  if (unknown.length > 0) return { blast, unknown }

  const byId = new Map(edits.map((edit) => [edit.id, edit]))
  const nodes = blast.nodes.map((node) => {
    const edit = byId.get(node.id)
    if (edit === undefined) return node
    const { draft: _wasDraft, ...rest } = node
    const stillDraft = edit.label === undefined && node.draft === true
    return {
      ...rest,
      ...(stillDraft ? { draft: true as const } : {}),
      ...(edit.label === undefined ? {} : { label: edit.label }),
      ...(edit.sublabel === undefined ? {} : { sublabel: edit.sublabel }),
      ...(edit.tag === undefined ? {} : { tag: edit.tag }),
      ...(edit.description === undefined ? {} : { description: edit.description }),
    }
  })

  return { blast: { ...blast, nodes }, unknown: [] }
}

/**
 * The verdicts, and the derivation that follows every one of them.
 *
 * `deriveVerdicts` runs on the whole board after each call rather than on the
 * nodes that were touched, and that is not laziness. A single `unaffected` can
 * shield a hundred nodes and a single `breaks` can un-shield them again, so the
 * blast radius of an assessment is the graph. Recomputing all of it is both
 * simpler and the only version that is right.
 *
 * `shieldedBy` is never accepted from an edit. It is derived or it is
 * nothing, which is what keeps a stop's coverage a property of the graph rather
 * than a claim anybody can make.
 */
export function assessBlast(
  blast: Blast,
  edits: readonly BlastAssessment[],
): BlastFilled & { refused: string[] } {
  const unknown = missing(blast, edits.map((edit) => edit.id))
  if (unknown.length > 0) return { blast, unknown, refused: [] }

  const byId = new Map(edits.map((edit) => [edit.id, edit]))
  const refused: string[] = []

  const nodes: BlastNode[] = blast.nodes.map((node) => {
    const edit = byId.get(node.id)
    if (edit === undefined) return node

    /*
     * Each field belongs to one kind of node, and putting it on the other is a
     * claim about code nobody read. A contract on a dependent describes a
     * surface nobody altered; a verdict on the change means "what I do to my
     * callers" where everywhere else it means "what was done to me".
     */
    const wrongWay =
      (edit.contract !== undefined && node.changed !== true) ||
      ((edit.changeType !== undefined || edit.effect !== undefined) && node.changed === true)
    if (wrongWay) {
      refused.push(node.id)
      return node
    }

    const { shieldedBy: _derived, via: _alsoDerived, ...rest } = node
    if (node.changed === true) {
      return edit.contract === undefined ? rest : { ...rest, contract: edit.contract }
    }
    return {
      ...rest,
      ...(edit.changeType === undefined ? {} : { changeType: edit.changeType }),
      ...(edit.effect === undefined ? {} : { effect: edit.effect }),
    }
  })

  return {
    blast: { ...blast, nodes: deriveVerdicts(nodes, blast.edges) },
    unknown: [],
    refused,
  }
}

/**
 * Answers to the uses nobody could prove.
 *
 * Two shapes, both legitimate, and the second is not a lesser answer:
 * "determined at runtime, and here is what determines it" is a
 * fact a reviewer wants, and it is distinguishable from silence — which is the
 * whole reason the gate can demand one.
 *
 * `targets` is *not* applied here. Naming what a use reaches means new nodes,
 * and new nodes come from a walk rather than from an edit; this module cannot
 * add one and should not learn how. So the targets are handed back for the
 * caller to walk, and only the recorded answer is written.
 */
export function resolveBlastUnproven(
  blast: Blast,
  answers: readonly BlastAnswer[],
): BlastFilled & { toWalk: { id: string; targets: { path: string; name: string }[] }[] } {
  const unknown = missing(blast, answers.map((answer) => answer.id))
  if (unknown.length > 0) return { blast, unknown, toWalk: [] }

  const byId = new Map(answers.map((answer) => [answer.id, answer]))
  const toWalk: { id: string; targets: { path: string; name: string }[] }[] = []

  const nodes = blast.nodes.map((node) => {
    const answer = byId.get(node.id)
    if (answer === undefined || node.unproven === undefined) return node
    if (answer.targets !== undefined && answer.targets.length > 0) {
      toWalk.push({ id: node.id, targets: answer.targets })
    }
    return answer.runtime === undefined
      ? node
      : { ...node, unproven: { ...node.unproven, runtime: answer.runtime } }
  })

  return { blast: { ...blast, nodes }, unknown: [], toWalk }
}

/**
 * What is left to do.
 *
 * Re-exported rather than implemented here. It belongs beside `blastProblems`,
 * which asks the same question at the moment an agent claims to be finished, and
 * two copies of one question is the drift `worklistOf` warns about.
 */
export { blastWork } from "../../lib/schemas/diagram/blast"
