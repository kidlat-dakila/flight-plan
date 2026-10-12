import { listJourneyNodes } from "@flightplan/codegraph"
import type { BlockLabel, JourneyNode, Segment, TriggerLabel } from "@flightplan/configurations"
import { idProblemOf, refuse, type SegmentsOutcome } from "./refusal"
import type { JourneyEdit } from "./schemas"

const NO_DIAGRAM_MESSAGE = "This artifact has no Journey Flow Diagram to write into."

const quoted = (ids: readonly string[]): string => ids.map((id) => `\`${id}\``).join(", ")

const editTriggerLabel = (trigger: TriggerLabel, { triggerLabels = [] }: JourneyEdit): TriggerLabel => {
  const written = triggerLabels.find((one) => one.codeBlockId === trigger.codeBlock.id)
  return written === undefined ? trigger : { ...trigger, label: written.label }
}

const editBlockLabel = (listed: BlockLabel, { blockLabels = [] }: JourneyEdit): BlockLabel => {
  const written = blockLabels.find((one) => one.codeBlockId === listed.codeBlock.id)
  return written === undefined ? listed : { ...listed, label: written.label }
}

const editNode = (node: JourneyNode, edit: JourneyEdit): JourneyNode => ({
  ...node,
  label: edit.label ?? node.label,
  description: edit.description === undefined ? node.description : edit.description,
  triggerLabels: node.triggerLabels.map((trigger) => editTriggerLabel(trigger, edit)),
  blockLabels: node.blockLabels.map((listed) => editBlockLabel(listed, edit)),
})

const amendNode = (node: JourneyNode, editById: ReadonlyMap<string, JourneyEdit>): JourneyNode => {
  const edit = editById.get(node.id)
  const edited = edit === undefined ? node : editNode(node, edit)
  return { ...edited, children: edited.children.map((child) => amendNode(child, editById)) }
}

const amendSegment = (segment: Segment, editById: ReadonlyMap<string, JourneyEdit>): Segment =>
  segment.journey === null
    ? segment
    : { ...segment, journey: { ...segment.journey, journeyNodes: segment.journey.journeyNodes.map((node) => amendNode(node, editById)) } }

const unknownTriggerIdsOf = (node: JourneyNode | undefined, { triggerLabels = [] }: JourneyEdit): string[] => {
  const knownIds = new Set(node?.triggerLabels.map((trigger) => trigger.codeBlock.id))
  return triggerLabels.map((written) => written.codeBlockId).filter((codeBlockId) => !knownIds.has(codeBlockId))
}

const unknownBlockIdsOf = (node: JourneyNode | undefined, { blockLabels = [] }: JourneyEdit): string[] => {
  const knownIds = new Set(node?.blockLabels.map((listed) => listed.codeBlock.id))
  return blockLabels.map((written) => written.codeBlockId).filter((codeBlockId) => !knownIds.has(codeBlockId))
}

export const journeyTextsOf = (edits: readonly JourneyEdit[]): string[] => edits.map((edit) => edit.description ?? "")

export const amendJourney = (segments: readonly Segment[], edits: readonly JourneyEdit[]): SegmentsOutcome => {
  const nodes = segments.flatMap((segment) => listJourneyNodes(segment.journey?.journeyNodes ?? []))
  if (nodes.length === 0) return refuse(NO_DIAGRAM_MESSAGE)
  const idProblem = idProblemOf("Journey Flow Diagram node", edits.map((edit) => edit.id), nodes.map((node) => node.id))
  if (idProblem !== null) return refuse(idProblem)
  const unknownTriggers = edits.flatMap((edit) =>
    unknownTriggerIdsOf(nodes.find((node) => node.id === edit.id), edit).map((codeBlockId) => `${quoted([codeBlockId])} on ${quoted([edit.id])}`))
  if (unknownTriggers.length > 0) {
    return refuse(`A trigger label is written by the \`codeBlockId\` its node lists, and there is none for ${unknownTriggers.join(", ")}.`)
  }
  const unknownBlocks = edits.flatMap((edit) =>
    unknownBlockIdsOf(nodes.find((node) => node.id === edit.id), edit).map((codeBlockId) => `${quoted([codeBlockId])} on ${quoted([edit.id])}`))
  if (unknownBlocks.length > 0) {
    return refuse(`A block label is written by the \`codeBlockId\` its node lists, and there is none for ${unknownBlocks.join(", ")}.`)
  }
  const editById = new Map(edits.map((edit) => [edit.id, edit]))
  return { kind: "amended", segments: segments.map((segment) => amendSegment(segment, editById)) }
}
