import { GENERATED_NODE_CATEGORIES, type ComponentReturn, type JourneyNode, type NodeCategory, type Segment } from "@flightplan/configurations"
import { idProblemOf, refuse, type SegmentsOutcome } from "./refusal"
import type { JourneyEdit } from "./schemas"

const NO_DIAGRAM_MESSAGE = "This artifact has no Journey Flow Diagram to write into."

const editNode = (node: JourneyNode, edit: JourneyEdit): JourneyNode => {
  const description = edit.description === undefined ? node.description : edit.description
  return node.kind === "entry-point"
    ? { ...node, label: edit.label ?? node.label, description }
    : { ...node, label: edit.label ?? node.label, description, category: edit.category ?? node.category }
}

const editReturn = (componentReturn: ComponentReturn, edit: JourneyEdit): ComponentReturn => ({
  ...componentReturn,
  label: edit.label ?? componentReturn.label,
  description: edit.description === undefined ? componentReturn.description : edit.description,
})

const editReturnsOf = (node: JourneyNode, editById: ReadonlyMap<string, JourneyEdit>): JourneyNode =>
  node.kind === "entry-point"
    ? node
    : {
        ...node,
        returns: node.returns.map((componentReturn) => {
          const edit = editById.get(componentReturn.id)
          return edit === undefined ? componentReturn : editReturn(componentReturn, edit)
        }),
      }

const returnIdsOf = (node: JourneyNode): string[] => (node.kind === "entry-point" ? [] : node.returns.map((componentReturn) => componentReturn.id))

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
            return editReturnsOf(edit === undefined ? node : editNode(node, edit), editById)
          }),
        },
      }

export const journeyTextsOf = (edits: readonly JourneyEdit[]): string[] => edits.map((edit) => edit.description ?? "")

export const amendJourney = (segments: readonly Segment[], edits: readonly JourneyEdit[]): SegmentsOutcome => {
  const nodes = segments.flatMap((segment) => segment.journey?.nodes ?? [])
  if (nodes.length === 0) return refuse(NO_DIAGRAM_MESSAGE)
  const returnIds = nodes.flatMap(returnIdsOf)
  const idProblem = idProblemOf("Journey Flow Diagram node", edits.map((edit) => edit.id), [...nodes.map((node) => node.id), ...returnIds])
  if (idProblem !== null) return refuse(idProblem)
  const categorisedReturnIds = edits.filter((edit) => edit.category !== undefined && returnIds.includes(edit.id)).map((edit) => edit.id)
  if (categorisedReturnIds.length > 0) {
    return refuse(`A return of a component has no category: ${quoted(categorisedReturnIds)}. It takes a label and a description.`)
  }
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
