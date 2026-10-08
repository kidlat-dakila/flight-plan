import { GENERATED_NODE_CATEGORIES, type JourneyNode, type NodeCategory, type Segment } from "@flightplan/configurations"
import { idProblemOf, refuse, type SegmentsOutcome } from "./refusal"
import type { JourneyEdit } from "./schemas"

const NO_DIAGRAM_MESSAGE = "This artifact has no Journey Flow Diagram to write into."

const editNode = (node: JourneyNode, edit: JourneyEdit): JourneyNode => {
  const description = edit.description === undefined ? node.description : edit.description
  return node.kind === "entry-point"
    ? { ...node, label: edit.label ?? node.label, description }
    : { ...node, label: edit.label ?? node.label, description, category: edit.category ?? node.category }
}

const quoted = (ids: readonly string[]): string => ids.map((id) => `\`${id}\``).join(", ")

const isGenerated = (category: NodeCategory): boolean => GENERATED_NODE_CATEGORIES.includes(category)

const replacesGeneratedCategory = (node: JourneyNode, { id, category }: JourneyEdit): boolean =>
  node.kind === "declaration" && node.id === id && category !== undefined && category !== node.category && (isGenerated(category) || isGenerated(node.category))

const amendSegment = (segment: Segment, editById: ReadonlyMap<string, JourneyEdit>): Segment =>
  segment.journey === null
    ? segment
    : {
        ...segment,
        journey: {
          ...segment.journey,
          nodes: segment.journey.nodes.map((node) => {
            const edit = editById.get(node.id)
            return edit === undefined ? node : editNode(node, edit)
          }),
        },
      }

export const journeyTextsOf = (edits: readonly JourneyEdit[]): string[] => edits.map((edit) => edit.description ?? "")

export const amendJourney = (segments: readonly Segment[], edits: readonly JourneyEdit[]): SegmentsOutcome => {
  const nodes = segments.flatMap((segment) => segment.journey?.nodes ?? [])
  if (nodes.length === 0) return refuse(NO_DIAGRAM_MESSAGE)
  const idProblem = idProblemOf("Journey Flow Diagram node", edits.map((edit) => edit.id), nodes.map((node) => node.id))
  if (idProblem !== null) return refuse(idProblem)
  const categorisedEntryIds = edits
    .filter((edit) => edit.category !== undefined)
    .filter((edit) => nodes.some((node) => node.id === edit.id && node.kind === "entry-point"))
    .map((edit) => edit.id)
  if (categorisedEntryIds.length > 0) {
    return refuse(`An Entry Point Node has no category: ${quoted(categorisedEntryIds)}. It stands for what starts the flow, not for code.`)
  }
  const generatedCategoryIds = edits.filter((edit) => nodes.some((node) => replacesGeneratedCategory(node, edit))).map((edit) => edit.id)
  if (generatedCategoryIds.length > 0) {
    return refuse(`Flight Plan sets the categories ${quoted(GENERATED_NODE_CATEGORIES)}: one for a JSX component, one for the handler of a user action. They cannot be written or replaced: ${quoted(generatedCategoryIds)}.`)
  }
  const editById = new Map(edits.map((edit) => [edit.id, edit]))
  return { kind: "amended", segments: segments.map((segment) => amendSegment(segment, editById)) }
}
