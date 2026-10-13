import { z } from "zod"
import {
  composerLabelsSchema,
  railSchema,
  segmentViewSchema,
  unassignedFilesSchema,
} from "@/procedures/get-review/utils/schemas"
import { codeDefinitionSchema, codeLinkSchema, walkthroughControlsSchema } from "@flightplan/configurations"

export const getPublishedReviewInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
})

export const publishedReviewSchema = z.strictObject({
  documentTitle: z.string(),
  header: z.strictObject({ title: z.string(), isBranch: z.boolean(), label: z.string() }),
  actions: z.strictObject({ shareLabel: z.string(), submitLabel: z.string() }),
  unavailableFeature: z.strictObject({ title: z.string(), description: z.string(), closeLabel: z.string() }),
  unassignedFiles: unassignedFilesSchema.nullable(),
  rail: railSchema,
  segments: z.array(segmentViewSchema),
  walkthroughControls: walkthroughControlsSchema,
  composer: composerLabelsSchema,
  codeLinks: z.record(z.string(), codeLinkSchema),
  codeDefinitions: z.record(z.string(), codeDefinitionSchema),
})

export type GetPublishedReviewInput = z.infer<typeof getPublishedReviewInputSchema>
export type PublishedReview = z.infer<typeof publishedReviewSchema>
