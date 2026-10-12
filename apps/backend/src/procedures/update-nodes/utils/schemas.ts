import { z } from "zod"
import { reviewTargetShape, writtenSegmentIdShape } from "@/procedures/read-artifact/utils/schemas"
import type { NodeTally, WorkTally } from "@/procedures/read-artifact/utils/unwritten-work"
import { FINDING_KINDS, IMPACT_TYPES } from "@flightplan/configurations"

const prose = z.string().trim().min(1)

const findingEditSchema = z.strictObject({
  id: z.string().min(1).describe("A new id for this finding, unique in the artifact."),
  kind: z.enum(FINDING_KINDS),
  title: prose,
  reading: prose,
  trace: z.array(prose).min(1).optional().describe("The steps that prove it. Not on a `question`."),
  solution: z
    .string()
    .min(1)
    .optional()
    .describe("What this waypoint's lines should say instead, whole, with their indentation. Not on a `question`."),
})

const waypointEditSchema = z.strictObject({
  id: z.string().min(1).describe("The waypoint's id, as the artifact has it."),
  title: prose.optional().describe("What was done, and to what."),
  reading: prose.optional(),
  needsAttention: prose.nullable().optional().describe("Why a reviewer must not skim this one. `null` takes it back."),
  findings: z
    .array(findingEditSchema)
    .optional()
    .describe("What is wrong with this code. Replaces the waypoint's list, so send every finding it should keep."),
  position: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Where this waypoint ends up among the top-level waypoints of its file, counting from 1."),
})

const fileEditSchema = z.strictObject({
  path: z.string().min(1).describe("The File Section's path, as the artifact has it."),
  title: prose.optional().describe("What the reviewer is shown in this file."),
  summary: z.array(prose).optional().describe("The changes the context names for this file."),
})

const triggerLabelEditSchema = z.strictObject({
  codeBlockId: z.string().min(1).describe("The `codeBlockId` of one of the node's `triggerLabels`, as the artifact has it."),
  label: prose.describe("What the event or the data fetch is, in the reader's terms: what the user does, or what is loaded."),
})

const blockLabelEditSchema = z.strictObject({
  codeBlockId: z.string().min(1).describe("The `codeBlockId` of one of the node's `blockLabels`, as the artifact has it."),
  label: prose.describe("What the argument, the state, the hook, the effect or the step is for, in the reader's terms."),
})

const journeyEditSchema = z.strictObject({
  id: z.string().min(1).describe("The Journey Flow Diagram node's id, as the artifact has it. A node inside another is written by its own id."),
  label: prose.optional().describe("What this step does, not which code it is."),
  description: prose.nullable().optional().describe("How the step is reached and what it runs next. The page draws every edge as the same line with no label, so what matters about a connection belongs here."),
  triggerLabels: z.array(triggerLabelEditSchema).min(1).optional().describe("Labels for the node's events and data fetches, each by its `codeBlockId`."),
  blockLabels: z.array(blockLabelEditSchema).min(1).optional().describe("Labels for the node's arguments, state, hooks, effects and steps, each by its `codeBlockId`."),
})

const blastEditSchema = z.strictObject({
  path: z.string().min(1).describe("The path of a file on the Blast Diagram that the change did not touch."),
  impactType: z.enum(IMPACT_TYPES).optional().describe("What the change does to the file. Never for a type error. `breaks` and `behaviour-changes` always with an `impactReason`."),
  impactReason: prose.optional().describe("On `breaks` and `behaviour-changes` only: what the author did not account for in the file. Not on `unaffected`."),
})

const fileOrderSchema = z.strictObject({
  files: z.array(z.string().min(1)).min(1).describe("Every File Section's path exactly once. One left out is refused, not dropped."),
})

const segmentEditShape = {
  title: prose.optional().describe("The segment's title: a very short text of what its context is about."),
  context: prose.optional().describe("The Context Section, as Markdown: why the change matters, what it changes from outside and what changed inside. Replaces the whole section."),
  intro: prose.nullable().optional().describe("The one line that frames the Code Walkthrough. `null` takes it back."),
  order: fileOrderSchema.optional().describe("The order a reader walks the File Sections in."),
}

export const updateNodesInputShape = {
  ...reviewTargetShape,
  segmentId: writtenSegmentIdShape,
  ...segmentEditShape,
  waypoints: z.array(waypointEditSchema).min(1).optional(),
  files: z.array(fileEditSchema).min(1).optional().describe("File Sections, by path."),
  journey: z.array(journeyEditSchema).min(1).optional().describe("Journey Flow Diagram nodes."),
  blast: z.array(blastEditSchema).min(1).optional().describe("Blast Diagram files, by path. Work this before the prose."),
}

export const updateNodesInputSchema = z.strictObject(updateNodesInputShape)

export type UpdateNodesInput = z.infer<typeof updateNodesInputSchema>
export type SegmentEdit = Pick<UpdateNodesInput, "title" | "context" | "intro" | "order">
export type FindingEdit = z.infer<typeof findingEditSchema>
export type WaypointEdit = z.infer<typeof waypointEditSchema>
export type FileEdit = z.infer<typeof fileEditSchema>
export type JourneyEdit = z.infer<typeof journeyEditSchema>
export type BlastEdit = z.infer<typeof blastEditSchema>

export type ArtifactWriting
  = | { readonly kind: "written", readonly note: string, readonly nodes: NodeTally, readonly unwritten: WorkTally }
    | { readonly kind: "rejected", readonly message: string }
