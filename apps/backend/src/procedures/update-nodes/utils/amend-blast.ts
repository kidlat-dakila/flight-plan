import { isChangedFile } from "@flightplan/codegraph"
import type { BlastNode, Segment } from "@flightplan/configurations"
import { idProblemOf, refuse, type SegmentsOutcome } from "./refusal"
import type { BlastEdit } from "./schemas"

const NO_DIAGRAM_MESSAGE = "This artifact has no Blast Diagram to write into."

const quoted = (paths: readonly string[]): string => paths.map((path) => `\`${path}\``).join(", ")

const STOP_IMPACT_TYPE = "unaffected"

const writtenTypeOf = (node: BlastNode, edit: BlastEdit): BlastNode["impactType"] => edit.impactType ?? node.impactType

const isBareImpactType = (node: BlastNode, edit: BlastEdit): boolean =>
  edit.impactType !== undefined && edit.impactType !== STOP_IMPACT_TYPE && edit.impactReason === undefined && node.impactReason === null

const isReasonedStop = (node: BlastNode, edit: BlastEdit): boolean =>
  edit.impactReason !== undefined && writtenTypeOf(node, edit) === STOP_IMPACT_TYPE

const isBareImpactReason = (node: BlastNode, edit: BlastEdit): boolean =>
  edit.impactReason !== undefined && edit.impactType === undefined && node.impactType === null

const editNode = (node: BlastNode, edit: BlastEdit): BlastNode => ({
  ...node,
  impactType: writtenTypeOf(node, edit),
  impactReason: writtenTypeOf(node, edit) === STOP_IMPACT_TYPE ? null : edit.impactReason ?? node.impactReason,
})

const amendSegment = (segment: Segment, editByPath: ReadonlyMap<string, BlastEdit>): Segment =>
  segment.blast === null
    ? segment
    : {
        ...segment,
        blast: {
          ...segment.blast,
          nodes: segment.blast.nodes.map((node) => {
            const edit = editByPath.get(node.path)
            return edit === undefined ? node : editNode(node, edit)
          }),
        },
      }

const ruleProblemOf = (nodes: readonly BlastNode[], edits: readonly BlastEdit[]): string | null => {
  const pairs = edits.flatMap((edit) => nodes.filter((node) => node.path === edit.path).map((node) => ({ node, edit })))
  const pathsWhere = (isBroken: (node: BlastNode, edit: BlastEdit) => boolean): string[] =>
    pairs.filter(({ node, edit }) => isBroken(node, edit)).map(({ edit }) => edit.path)
  const changedPaths = pathsWhere(isChangedFile)
  if (changedPaths.length > 0) {
    return `An impact is what the change does to a file it did not touch, and ${quoted(changedPaths)} is part of the change.`
  }
  const reasonedStopPaths = pathsWhere(isReasonedStop)
  if (reasonedStopPaths.length > 0) return `An unaffected file takes no reason: ${quoted(reasonedStopPaths)} got an \`impactReason\`. Send \`impactType\` alone.`
  const bareTypePaths = pathsWhere(isBareImpactType)
  if (bareTypePaths.length > 0) return `A file the change breaks or changes needs the reason: ${quoted(bareTypePaths)} got an \`impactType\` and no \`impactReason\`.`
  const bareReasonPaths = pathsWhere(isBareImpactReason)
  return bareReasonPaths.length > 0
    ? `An impact reason explains an impact type: ${quoted(bareReasonPaths)} got an \`impactReason\` and has no \`impactType\`.`
    : null
}

export const blastTextsOf = (edits: readonly BlastEdit[]): string[] => edits.map((edit) => edit.impactReason ?? "")

export const amendBlast = (segments: readonly Segment[], edits: readonly BlastEdit[]): SegmentsOutcome => {
  const nodes = segments.flatMap((segment) => segment.blast?.nodes ?? [])
  if (nodes.length === 0) return refuse(NO_DIAGRAM_MESSAGE)
  const pathProblem = idProblemOf("Blast Diagram file", edits.map((edit) => edit.path), nodes.map((node) => node.path))
  if (pathProblem !== null) return refuse(pathProblem)
  const ruleProblem = ruleProblemOf(nodes, edits)
  if (ruleProblem !== null) return refuse(ruleProblem)
  const editByPath = new Map(edits.map((edit) => [edit.path, edit]))
  return { kind: "amended", segments: segments.map((segment) => amendSegment(segment, editByPath)) }
}
