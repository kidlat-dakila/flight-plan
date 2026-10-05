import { isEpicenter } from "@/procedures/get-review/utils/blast/filter"
import type { BlastNode, Segment } from "@/procedures/get-review/utils/review-artifact"
import { idProblemOf, refuse, type SegmentsOutcome } from "./refusal"
import type { BlastEdit } from "./schemas"

const NO_DIAGRAM_MESSAGE = "This artifact has no Blast Diagram to write into."

const quoted = (ids: readonly string[]): string => ids.map((id) => `\`${id}\``).join(", ")

const isMisplaced = (node: BlastNode, edit: BlastEdit): boolean =>
  isEpicenter(node) ? edit.verdict !== undefined || edit.effect !== undefined : edit.contract !== undefined

const isBareVerdict = (node: BlastNode, edit: BlastEdit): boolean =>
  edit.verdict !== undefined && edit.effect === undefined && node.effect === null

const isBareEffect = (node: BlastNode, edit: BlastEdit): boolean =>
  edit.effect !== undefined && edit.verdict === undefined && node.verdict === null

const editNode = (node: BlastNode, edit: BlastEdit): BlastNode => ({
  ...node,
  label: edit.label ?? node.label,
  contract: edit.contract ?? node.contract,
  verdict: edit.verdict ?? node.verdict,
  effect: edit.effect ?? node.effect,
})

const amendSegment = (segment: Segment, editById: ReadonlyMap<string, BlastEdit>): Segment =>
  segment.blast === null
    ? segment
    : {
        ...segment,
        blast: {
          ...segment.blast,
          nodes: segment.blast.nodes.map((node) => {
            const edit = editById.get(node.id)
            return edit === undefined ? node : editNode(node, edit)
          }),
        },
      }

const ruleProblemOf = (nodes: readonly BlastNode[], edits: readonly BlastEdit[]): string | null => {
  const pairs = edits.flatMap((edit) => nodes.filter((node) => node.id === edit.id).map((node) => ({ node, edit })))
  const idsWhere = (isBroken: (node: BlastNode, edit: BlastEdit) => boolean): string[] =>
    pairs.filter(({ node, edit }) => isBroken(node, edit)).map(({ edit }) => edit.id)
  const misplacedIds = idsWhere(isMisplaced)
  if (misplacedIds.length > 0) {
    return `Each field belongs to one kind of node: a \`contract\` states what the change did to a declaration the diff touched, and \`verdict\` and \`effect\` say what the change does to something that uses it. ${quoted(misplacedIds)} got the wrong one.`
  }
  const bareVerdictIds = idsWhere(isBareVerdict)
  if (bareVerdictIds.length > 0) return `A verdict needs the evidence for it: ${quoted(bareVerdictIds)} got a \`verdict\` and no \`effect\`.`
  const bareEffectIds = idsWhere(isBareEffect)
  return bareEffectIds.length > 0
    ? `An effect is the evidence for a verdict: ${quoted(bareEffectIds)} got an \`effect\` and has no \`verdict\`.`
    : null
}

export const blastTextsOf = (edits: readonly BlastEdit[]): string[] =>
  edits.flatMap((edit) => [edit.contract?.before ?? "", edit.contract?.now ?? "", edit.effect ?? ""])

export const amendBlast = (segments: readonly Segment[], edits: readonly BlastEdit[]): SegmentsOutcome => {
  const nodes = segments.flatMap((segment) => segment.blast?.nodes ?? [])
  if (nodes.length === 0) return refuse(NO_DIAGRAM_MESSAGE)
  const idProblem = idProblemOf("Blast Diagram node", edits.map((edit) => edit.id), nodes.map((node) => node.id))
  if (idProblem !== null) return refuse(idProblem)
  const ruleProblem = ruleProblemOf(nodes, edits)
  if (ruleProblem !== null) return refuse(ruleProblem)
  const editById = new Map(edits.map((edit) => [edit.id, edit]))
  return { kind: "amended", segments: segments.map((segment) => amendSegment(segment, editById)) }
}
