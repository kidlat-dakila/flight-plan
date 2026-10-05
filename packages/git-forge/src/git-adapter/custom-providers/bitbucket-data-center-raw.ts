import { z } from "zod"

export const dataCenterUserSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  displayName: z.string().optional(),
  emailAddress: z.string().optional(),
  avatarUrl: z.string().optional(),
})

const dataCenterParticipantSchema = z.object({
  user: dataCenterUserSchema,
  role: z.string().optional(),
  approved: z.boolean().optional(),
  status: z.string().optional(),
})

const dataCenterRefSchema = z.object({
  id: z.string().optional(),
  displayId: z.string().optional(),
  latestCommit: z.string().optional(),
})

export const dataCenterPullRequestSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  state: z.string().optional(),
  draft: z.boolean().optional(),
  createdDate: z.number().optional(),
  updatedDate: z.number().optional(),
  fromRef: dataCenterRefSchema.optional(),
  toRef: dataCenterRefSchema.optional(),
  author: dataCenterParticipantSchema.optional(),
  reviewers: z.array(dataCenterParticipantSchema).optional(),
  links: z.object({ self: z.array(z.object({ href: z.string().optional() })).optional() }).optional(),
})

export const dataCenterActivitySchema = z.object({
  action: z.string(),
  createdDate: z.number(),
  user: dataCenterUserSchema.optional(),
  commentAction: z.string().optional(),
})

export const dataCenterCommitSchema = z.object({
  committerTimestamp: z.number().optional(),
  authorTimestamp: z.number().optional(),
})

export function dataCenterPageSchema<Item extends z.ZodType>(item: Item): z.ZodObject<{
  values: z.ZodOptional<z.ZodArray<Item>>
  isLastPage: z.ZodOptional<z.ZodBoolean>
  nextPageStart: z.ZodOptional<z.ZodNumber>
}> {
  return z.object({
    values: z.array(item).optional(),
    isLastPage: z.boolean().optional(),
    nextPageStart: z.number().optional(),
  })
}

export type DataCenterUser = z.infer<typeof dataCenterUserSchema>

export type DataCenterParticipant = z.infer<typeof dataCenterParticipantSchema>

export type DataCenterPullRequest = z.infer<typeof dataCenterPullRequestSchema>

export type DataCenterActivity = z.infer<typeof dataCenterActivitySchema>

export type DataCenterCommit = z.infer<typeof dataCenterCommitSchema>
