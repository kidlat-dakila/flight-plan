import { z } from "zod"
import { BRANCH_STATUSES } from "./branch-status"
import { LINE_COLORS } from "./line-color"

export const LABEL_SEGMENT_KINDS = ["plain", "code"] as const

export const labelSegmentSchema = z.strictObject({ text: z.string(), kind: z.enum(LABEL_SEGMENT_KINDS) })

export const stopAuthorSchema = z.strictObject({
  name: z.string(),
  avatarUrl: z.string().nullable(),
  monogram: z.string(),
})

export const reviewTargetStopSchema = z.strictObject({
  id: z.string(),
  title: labelSegmentSchema,
  details: z.array(labelSegmentSchema),
  author: stopAuthorSchema.nullable(),
  href: z.string(),
  branchStatus: z.enum(BRANCH_STATUSES),
  statusLabel: z.string(),
  updatedLabel: z.string(),
})

export const repositoryLineContentSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("targets"), targets: z.array(reviewTargetStopSchema) }),
  z.strictObject({ kind: z.literal("empty"), message: z.string() }),
  z.strictObject({ kind: z.literal("no-branches"), message: z.string(), detail: z.string(), actionLabel: z.string() }),
  z.strictObject({
    kind: z.literal("problem"),
    message: z.string(),
    detail: z.string().nullable(),
    actionLabel: z.string(),
    actionHref: z.string(),
  }),
])

export const newTargetPromptSchema = z.strictObject({
  id: z.string(),
  kindLabel: z.string(),
  title: labelSegmentSchema,
  details: z.array(labelSegmentSchema),
  author: stopAuthorSchema.nullable(),
  updatedLabel: z.string(),
  createReviewHref: z.string(),
})

export const repositoryLineSchema = z.strictObject({
  name: z.string(),
  lineColor: z.enum(LINE_COLORS),
  lineLabel: z.string(),
  source: z.array(labelSegmentSchema),
  countLabel: z.string(),
  createReviewHref: z.string(),
  configurationHref: z.string(),
  configurationLabel: z.string(),
  addTargetLabel: z.string(),
  newTargets: z.array(newTargetPromptSchema),
  content: repositoryLineContentSchema,
})

export const statusFilterSchema = z.strictObject({
  buttonLabel: z.string(),
  isDefault: z.boolean(),
  options: z.array(
    z.strictObject({
      status: z.enum(BRANCH_STATUSES),
      label: z.string(),
      countLabel: z.string(),
      isSelected: z.boolean(),
      toggledStatuses: z.array(z.enum(BRANCH_STATUSES)),
    }),
  ),
})

export const authorFilterSchema = z.strictObject({
  buttonLabel: z.string(),
  isDefault: z.boolean(),
  options: z.array(
    z.strictObject({
      key: z.string(),
      label: z.string(),
      person: z.strictObject({ avatarUrl: z.string().nullable(), monogram: z.string() }).nullable(),
      countLabel: z.string(),
      isSelected: z.boolean(),
      toggledAuthors: z.array(z.string()).nullable(),
    }),
  ),
})

export const fixtureIndexSchema = z.strictObject({
  caseSelect: z.strictObject({
    label: z.string(),
    value: z.string(),
    options: z.array(z.strictObject({ value: z.string(), label: z.string() })),
  }),
  repository: repositoryLineSchema,
})

export const repositoryIndexSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("empty"), notice: z.string().nullable(), fixtures: fixtureIndexSchema.nullable() }),
  z.strictObject({
    kind: z.literal("repositories"),
    notice: z.string().nullable(),
    fixtures: fixtureIndexSchema.nullable(),
    summaryLabel: z.string(),
    statusFilter: statusFilterSchema,
    authorFilter: authorFilterSchema,
    repositories: z.array(repositoryLineSchema),
  }),
])

export const listRepositoriesInputSchema = z.strictObject({
  statuses: z.array(z.string()).nullable(),
  authors: z.array(z.string()).nullable(),
  fixtureCase: z.string().nullish(),
})

export type LabelSegment = z.infer<typeof labelSegmentSchema>
export type StatusFilter = z.infer<typeof statusFilterSchema>
export type AuthorFilter = z.infer<typeof authorFilterSchema>
export type RepositoryListRequest = z.infer<typeof listRepositoriesInputSchema>
export type StopAuthor = z.infer<typeof stopAuthorSchema>
export type NewTargetPrompt = z.infer<typeof newTargetPromptSchema>
export type ReviewTargetStop = z.infer<typeof reviewTargetStopSchema>
export type RepositoryLineContent = z.infer<typeof repositoryLineContentSchema>
export type RepositoryLine = z.infer<typeof repositoryLineSchema>
export type FixtureIndex = z.infer<typeof fixtureIndexSchema>
export type RepositoryIndex = z.infer<typeof repositoryIndexSchema>
type WithoutFixtures<Index> = Index extends unknown ? Omit<Index, "fixtures"> : never
export type RepositoryListing = WithoutFixtures<RepositoryIndex>
