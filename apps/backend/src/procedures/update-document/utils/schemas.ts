import { z } from "zod"
import { reviewTargetShape, segmentIdShape } from "@/procedures/read-artifact/utils/schemas"

const prose = z.string().trim().min(1)

const fileOrderSchema = z.strictObject({
  files: z.array(z.string().min(1)).min(1).describe("Every File Section's path exactly once. One left out is refused, not dropped."),
})

export const updateDocumentInputShape = {
  ...reviewTargetShape,
  segmentId: segmentIdShape,
  context: prose.optional().describe("The Context Section, as Markdown: why the change matters, what it changes from outside and what changed inside. Replaces the whole section."),
  intro: prose.nullable().optional().describe("The one line that frames the Code Walkthrough. `null` takes it back."),
  order: fileOrderSchema.optional().describe("The order a reader walks the File Sections in."),
  journeyAbsence: prose.optional().describe("Only where the segment has no Journey Flow Diagram: one line saying why."),
  blastAbsence: prose.optional().describe("Only where the segment has no Blast Diagram: one line saying why."),
}

export const updateDocumentInputSchema = z.strictObject(updateDocumentInputShape)

export type UpdateDocumentInput = z.infer<typeof updateDocumentInputSchema>
export type DocumentEdit = Omit<UpdateDocumentInput, "repositoryName" | "targetId">
