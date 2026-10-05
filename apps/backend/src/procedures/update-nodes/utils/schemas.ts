import { z } from "zod"
import { reviewTargetShape, segmentIdShape } from "@/procedures/read-artifact/utils/schemas"
import type { WorkTally } from "@/procedures/read-artifact/utils/unwritten-work"
import { FINDING_KINDS, NODE_CATEGORIES } from "@flightplan/configurations"

const WRITTEN_VERDICTS = ["breaks", "behaviour-changes", "unaffected"] as const

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
  summary: z.array(prose).optional().describe("The file's items from the implementation list."),
})

const journeyEditSchema = z.strictObject({
  id: z.string().min(1).describe("The Journey Flow Diagram node's id, as the artifact has it."),
  label: prose.optional().describe("What this step does, not which code it is."),
  description: prose.nullable().optional(),
  category: z.enum(NODE_CATEGORIES).optional().describe("Only where the category Flight Plan chose is wrong. Not on an Entry Point Node."),
})

const blastEditSchema = z.strictObject({
  id: z.string().min(1).describe("The Blast Diagram node's id, as the artifact has it."),
  label: prose.optional(),
  contract: z
    .strictObject({
      before: prose.nullable().describe("Its surface before, or null if it did not exist."),
      now: prose.describe("Its surface after the change."),
    })
    .optional()
    .describe("On a changed declaration only: what anyone using it has to know."),
  verdict: z.enum(WRITTEN_VERDICTS).optional().describe("On a dependent only: what the change does to it. Always with an `effect`."),
  effect: prose.optional().describe("On a dependent only: one line of evidence for the verdict."),
})

export const updateNodesInputShape = {
  ...reviewTargetShape,
  segmentId: segmentIdShape,
  waypoints: z.array(waypointEditSchema).min(1).optional(),
  files: z.array(fileEditSchema).min(1).optional().describe("File Sections, by path."),
  journey: z.array(journeyEditSchema).min(1).optional().describe("Journey Flow Diagram nodes."),
  blast: z.array(blastEditSchema).min(1).optional().describe("Blast Diagram nodes. Work this before the prose."),
}

export const updateNodesInputSchema = z.strictObject(updateNodesInputShape)

export type UpdateNodesInput = z.infer<typeof updateNodesInputSchema>
export type FindingEdit = z.infer<typeof findingEditSchema>
export type WaypointEdit = z.infer<typeof waypointEditSchema>
export type FileEdit = z.infer<typeof fileEditSchema>
export type JourneyEdit = z.infer<typeof journeyEditSchema>
export type BlastEdit = z.infer<typeof blastEditSchema>

export type ArtifactWriting
  = | { readonly kind: "written", readonly note: string, readonly unwritten: WorkTally }
    | { readonly kind: "rejected", readonly message: string }
