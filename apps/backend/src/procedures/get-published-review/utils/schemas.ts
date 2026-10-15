import { z } from "zod"
import {
  composerLabelsSchema,
  railSchema,
  segmentViewSchema,
  unassignedFilesSchema,
} from "@/procedures/get-review/utils/schemas"
import { codeDefinitionSchema, codeLinkSchema, linkSchema } from "@flightplan/configurations"

export const getPublishedReviewInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
})

export const installGuideSchema = z.strictObject({
  intro: z.string(),
  commands: z.array(z.strictObject({ label: z.string(), command: z.string() })),
  copyLabel: z.string(),
  copiedLabel: z.string(),
})

export const publishedReviewSchema = z.strictObject({
  documentTitle: z.string(),
  header: z.strictObject({ title: z.string(), isBranch: z.boolean(), label: z.string() }),
  importLink: linkSchema.nullable(),
  actions: z.strictObject({ shareLabel: z.string(), submitLabel: z.string() }),
  unavailableFeature: z.strictObject({
    title: z.string(),
    description: z.string(),
    closeLabel: z.string(),
    install: installGuideSchema,
  }),
  unassignedFiles: unassignedFilesSchema.nullable(),
  rail: railSchema,
  segments: z.array(segmentViewSchema),
  composer: composerLabelsSchema,
  codeLinks: z.record(z.string(), codeLinkSchema),
  codeDefinitions: z.record(z.string(), codeDefinitionSchema),
})

export type GetPublishedReviewInput = z.infer<typeof getPublishedReviewInputSchema>
export type PublishedReview = z.infer<typeof publishedReviewSchema>
export type InstallGuide = z.infer<typeof installGuideSchema>
