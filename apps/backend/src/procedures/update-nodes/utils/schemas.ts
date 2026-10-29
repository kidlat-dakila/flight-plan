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
  coreChange: prose.nullable().optional().describe("Why a reviewer must not skim this one. `null` takes it back."),
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

const triggerLabelEditSchema = z.strictObject({
  codeBlockId: z.string().min(1).describe("The `codeBlockId` of one of the node's `triggerLabels`, as the artifact has it."),
  label: prose.describe("What the event or the data fetch is, in the reader's terms: what the user does, or what is loaded."),
})

const rowPositionSchema = z.strictObject({
  line: z.number().int().positive(),
  column: z.number().int().positive(),
})

const blockLabelEditSchema = z.strictObject({
  codeBlockId: z.string().min(1).describe("The `codeBlockId` of one of the node's `blockLabels`, as the artifact has it."),
  at: rowPositionSchema
    .optional()
    .describe("The `at` of that block label, as the artifact has it: where its call, its return or its rendered value starts. Several rows of a card can share one `codeBlockId` and differ by `at`. Leave it out only on a block label that has none."),
  label: prose.describe("What the row does, in the reader's terms: what a call is for, what a return gives back or what a component renders there, what a throw raises and when, what a render row renders, what a memo works out, what an effect does, or what a row of a class, a route, a router or a store is for."),
})

const traceEditSchema = z.strictObject({
  id: z.string().min(1).describe("The Trace Diagram node's id, as the artifact has it. A node inside another is written by its own id."),
  label: prose.optional().describe("What this step does, not which code it is."),
  description: prose.nullable().optional().describe("How the step is reached and what it runs next. The page draws every edge as the same line with no label, so what matters about a connection belongs here."),
  triggerLabels: z.array(triggerLabelEditSchema).min(1).optional().describe("Labels for the node's events and data fetches, each by its `codeBlockId`."),
  blockLabels: z.array(blockLabelEditSchema).min(1).optional().describe("Labels for the node's rows, each by its `codeBlockId` and its `at`: the calls, returns and throws of a function, memo or effect card, the calls, memos, effects, returns and render rows of a component, and the rows of any other card."),
})

const blastEditSchema = z.strictObject({
  path: z.string().min(1).describe("The path of a file on the Blast Diagram that the change did not touch."),
  impactType: z.enum(IMPACT_TYPES).optional().describe("What the change does to the file. Never for a type error. `breaks` and `behaviour-changes` always with an `impactReason`."),
  impactReason: prose.optional().describe("On `breaks` and `behaviour-changes` only: what the author did not account for in the file. Not on `unaffected`."),
})

const contextCodeBlockEditSchema = z.strictObject({
  id: z.string().min(1).describe("The context code block's id, as `nodes` returns it: a code block's id, `library:<library>#<name>` or `language:<name>`."),
  description: prose.describe("What the code is and what it does, as Markdown, for a reader who has not seen it."),
})

const segmentEditShape = {
  title: prose.optional().describe("The segment's title: a very short text of what its context is about."),
  context: prose.optional().describe("The Context Section, as Markdown: why the change matters, what it changes from outside and what changed inside. Replaces the whole section."),
  traceDiagramTitle: prose.optional().describe("The Trace Diagram's title, in plain text on one line: the name of the flow it shows, ending in \"flow diagram\". Required where the segment has a diagram."),
  traceDiagramDescription: prose.optional().describe("The Trace Diagram told in words, shown above the diagram: where its paths start, what they run through and where they reach the change. Five sentences at most. Required where the segment has a diagram."),
}

export const updateNodesInputShape = {
  ...reviewTargetShape,
  segmentId: writtenSegmentIdShape,
  ...segmentEditShape,
  waypoints: z.array(waypointEditSchema).min(1).optional(),
  traceDiagram: z.array(traceEditSchema).min(1).optional().describe("Trace Diagram nodes."),
  blastDiagram: z.array(blastEditSchema).min(1).optional().describe("Blast Diagram files, by path. Work this before the prose."),
  contextCodeBlocks: z
    .array(contextCodeBlockEditSchema)
    .min(1)
    .optional()
    .describe("Context code blocks, by id. They belong to the whole artifact, so any `segmentId` of the artifact carries them."),
}

export const updateNodesInputSchema = z.strictObject(updateNodesInputShape)

export type UpdateNodesInput = z.infer<typeof updateNodesInputSchema>
export type SegmentEdit = Pick<UpdateNodesInput, "title" | "context" | "traceDiagramTitle" | "traceDiagramDescription">
export type FindingEdit = z.infer<typeof findingEditSchema>
export type WaypointEdit = z.infer<typeof waypointEditSchema>
export type TraceEdit = z.infer<typeof traceEditSchema>
export type BlastEdit = z.infer<typeof blastEditSchema>
export type ContextCodeBlockEdit = z.infer<typeof contextCodeBlockEditSchema>

export type ArtifactWriting
  = | { readonly kind: "written", readonly note: string, readonly nodes: NodeTally, readonly unwritten: WorkTally }
    | { readonly kind: "rejected", readonly message: string }
