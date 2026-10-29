import { blockLabelKeyOf } from "@/procedures/read-artifact/utils/block-label-rows"
import { listTraceNodes } from "@flightplan/codegraph"
import type { BlockLabel, TraceNode, Segment, TriggerLabel } from "@flightplan/configurations"
import { idProblemOf, refuse, type SegmentsOutcome } from "./refusal"
import type { TraceEdit } from "./schemas"

const NO_DIAGRAM_MESSAGE = "This artifact has no Trace Diagram to write into."

const quoted = (ids: readonly string[]): string => ids.map((id) => `\`${id}\``).join(", ")

const editTriggerLabel = (trigger: TriggerLabel, { triggerLabels = [] }: TraceEdit): TriggerLabel => {
  const written = triggerLabels.find((one) => one.codeBlockId === trigger.codeBlock.id)
  return written === undefined ? trigger : { ...trigger, label: written.label }
}

const listedKeyOf = ({ codeBlock, at }: BlockLabel): string => blockLabelKeyOf(codeBlock.id, at)

const editBlockLabel = (listed: BlockLabel, { blockLabels = [] }: TraceEdit): BlockLabel => {
  const key = listedKeyOf(listed)
  const written = blockLabels.find((one) => blockLabelKeyOf(one.codeBlockId, one.at) === key)
  return written === undefined ? listed : { ...listed, label: written.label }
}

const editNode = (node: TraceNode, edit: TraceEdit): TraceNode => ({
  ...node,
  label: edit.label ?? node.label,
  description: edit.description === undefined ? node.description : edit.description,
  triggerLabels: node.triggerLabels.map((trigger) => editTriggerLabel(trigger, edit)),
  blockLabels: node.blockLabels.map((listed) => editBlockLabel(listed, edit)),
})

const amendNode = (node: TraceNode, editById: ReadonlyMap<string, TraceEdit>): TraceNode => {
  const edit = editById.get(node.id)
  const edited = edit === undefined ? node : editNode(node, edit)
  return { ...edited, children: edited.children.map((child) => amendNode(child, editById)) }
}

const amendSegment = (segment: Segment, editById: ReadonlyMap<string, TraceEdit>): Segment =>
  segment.traceDiagram === null
    ? segment
    : { ...segment, traceDiagram: { ...segment.traceDiagram, traceNodes: segment.traceDiagram.traceNodes.map((node) => amendNode(node, editById)) } }

const unknownTriggerIdsOf = (node: TraceNode | undefined, { triggerLabels = [] }: TraceEdit): string[] => {
  const knownIds = new Set(node?.triggerLabels.map((trigger) => trigger.codeBlock.id))
  return triggerLabels.map((written) => written.codeBlockId).filter((codeBlockId) => !knownIds.has(codeBlockId))
}

const placeTextOf = ({ at }: BlockLabel): string => (at === undefined ? "no `at`" : `\`"at": ${JSON.stringify(at)}\``)

const listedPlacesOf = (node: TraceNode | undefined, codeBlockId: string): string[] =>
  (node?.blockLabels ?? []).filter((listed) => listed.codeBlock.id === codeBlockId).map(placeTextOf)

const unknownBlockLabelOf = (node: TraceNode | undefined, codeBlockId: string, nodeId: string, at: BlockLabel["at"]): string => {
  const places = listedPlacesOf(node, codeBlockId)
  const written = `${quoted([blockLabelKeyOf(codeBlockId, at)])} on ${quoted([nodeId])}`
  return places.length === 0 ? written : `${written} (that block is listed with ${places.join(", ")})`
}

const unknownBlockLabelsOf = (node: TraceNode | undefined, { id, blockLabels = [] }: TraceEdit): string[] => {
  const knownKeys = new Set(node?.blockLabels.map(listedKeyOf))
  return blockLabels
    .filter((written) => !knownKeys.has(blockLabelKeyOf(written.codeBlockId, written.at)))
    .map((written) => unknownBlockLabelOf(node, written.codeBlockId, id, written.at))
}

export const traceTextsOf = (edits: readonly TraceEdit[]): string[] => edits.map((edit) => edit.description ?? "")

export const amendTrace = (segments: readonly Segment[], edits: readonly TraceEdit[]): SegmentsOutcome => {
  const nodes = segments.flatMap((segment) => listTraceNodes(segment.traceDiagram?.traceNodes ?? []))
  if (nodes.length === 0) return refuse(NO_DIAGRAM_MESSAGE)
  const idProblem = idProblemOf("Trace Diagram node", edits.map((edit) => edit.id), nodes.map((node) => node.id))
  if (idProblem !== null) return refuse(idProblem)
  const unknownTriggers = edits.flatMap((edit) =>
    unknownTriggerIdsOf(nodes.find((node) => node.id === edit.id), edit).map((codeBlockId) => `${quoted([codeBlockId])} on ${quoted([edit.id])}`))
  if (unknownTriggers.length > 0) {
    return refuse(`A trigger label is written by the \`codeBlockId\` its node lists, and there is none for ${unknownTriggers.join(", ")}.`)
  }
  const unknownBlocks = edits.flatMap((edit) => unknownBlockLabelsOf(nodes.find((node) => node.id === edit.id), edit))
  if (unknownBlocks.length > 0) {
    return refuse(`A block label is written by the \`codeBlockId\` and the \`at\` its node lists, and there is none for ${unknownBlocks.join(", ")}.`)
  }
  const editById = new Map(edits.map((edit) => [edit.id, edit]))
  return { kind: "amended", segments: segments.map((segment) => amendSegment(segment, editById)) }
}
