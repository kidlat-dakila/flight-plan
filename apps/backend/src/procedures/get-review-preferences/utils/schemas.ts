import { z } from "zod"
import { CODE_BLOCK_CLASSIFICATIONS } from "@flightplan/configurations"
import { ARRANGED_SECTIONS, WALKTHROUGH_ORDERS, WRITE_UP_TIMINGS, type ReviewPreferences } from "./review-preferences"

const writeUpTimingSchema = z.enum(WRITE_UP_TIMINGS)

export const reviewPreferencesSchema = z.strictObject({
  spotlight: z.array(z.enum(CODE_BLOCK_CLASSIFICATIONS)),
  sectionWriteUps: z.strictObject({
    context: writeUpTimingSchema,
    traceDiagram: writeUpTimingSchema,
    blastDiagram: writeUpTimingSchema,
    walkthrough: writeUpTimingSchema,
    findings: writeUpTimingSchema,
  }),
  isSegmented: z.boolean(),
  walkthroughOrder: z.enum(WALKTHROUGH_ORDERS),
  sectionOrder: z.array(z.enum(ARRANGED_SECTIONS)),
  ignoredPaths: z.array(z.string()),
})

export const getReviewPreferencesInputSchema = z.strictObject({})

export const spotlightChoiceSchema = z.strictObject({
  classification: z.enum(CODE_BLOCK_CLASSIFICATIONS),
  label: z.string(),
  description: z.string(),
  isFeatured: z.boolean(),
})

export const spotlightGroupSchema = z.strictObject({
  label: z.string(),
  choices: z.array(spotlightChoiceSchema),
})

export const reviewPreferencesPageSchema = z.strictObject({
  preferences: reviewPreferencesSchema,
  isSaved: z.boolean(),
  defaultConfiguration: z.string().nullable(),
  spotlightGroups: z.array(spotlightGroupSchema),
})

export type ReviewPreferencesData = z.infer<typeof reviewPreferencesSchema>

export const toPreferencesData = (preferences: ReviewPreferences): ReviewPreferencesData => ({
  ...preferences,
  spotlight: [...preferences.spotlight],
  sectionWriteUps: { ...preferences.sectionWriteUps },
  sectionOrder: [...preferences.sectionOrder],
  ignoredPaths: [...preferences.ignoredPaths],
})

export type GetReviewPreferencesInput = z.infer<typeof getReviewPreferencesInputSchema>
export type ReviewPreferencesPage = z.infer<typeof reviewPreferencesPageSchema>
export type SpotlightGroup = z.infer<typeof spotlightGroupSchema>
