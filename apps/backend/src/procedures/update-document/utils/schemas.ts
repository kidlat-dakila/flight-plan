import { z } from "zod"
import { reviewTargetShape, segmentIdShape } from "@/procedures/read-artifact/utils/schemas"

const prose = z.string().trim().min(1)

const scenarioSchema = z.strictObject({
  when: prose.describe("A situation, in the reader's terms. Not a code path."),
  then: prose.describe("What a person or another system can observe."),
})

const implementationGroupSchema = z.strictObject({
  label: prose.describe("The place: a path, a directory, or an area."),
  items: z.array(prose).min(1).describe("One per change a reader would notice, each opening with the verb."),
})

const fileOrderSchema = z.strictObject({
  files: z.array(z.string().min(1)).min(1).describe("Every File Section's path exactly once. One left out is refused, not dropped."),
})

export const updateDocumentInputShape = {
  ...reviewTargetShape,
  segmentId: segmentIdShape,
  context: prose.optional().describe("Why anyone should care, in five sentences at most. No identifiers and no paths."),
  overview: z.array(scenarioSchema).min(1).optional().describe("One per scenario a reader would notice. Replaces the list."),
  implementation: z.array(implementationGroupSchema).min(1).optional().describe("One group per place, in the order the tour walks them. Replaces the list."),
  intro: prose.nullable().optional().describe("The one line that frames the Code Walkthrough. `null` takes it back."),
  order: fileOrderSchema.optional().describe("The order a reader walks the File Sections in."),
  journeyAbsence: prose.optional().describe("Only where the segment has no Journey Flow Diagram: one line saying why."),
  blastAbsence: prose.optional().describe("Only where the segment has no Blast Diagram: one line saying why."),
}

export const updateDocumentInputSchema = z.strictObject(updateDocumentInputShape)

export type UpdateDocumentInput = z.infer<typeof updateDocumentInputSchema>
export type DocumentEdit = Omit<UpdateDocumentInput, "repositoryName" | "targetId">
