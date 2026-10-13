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
  version: z.number().optional(),
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

export interface DataCenterComment {
  id: number
  version?: number
  text?: string
  author?: DataCenterUser
  createdDate?: number
  threadResolved?: boolean
  comments?: DataCenterComment[]
}

export const dataCenterCommentSchema: z.ZodType<DataCenterComment> = z.object({
  id: z.number(),
  version: z.number().optional(),
  text: z.string().optional(),
  author: dataCenterUserSchema.optional(),
  createdDate: z.number().optional(),
  threadResolved: z.boolean().optional(),
  comments: z.array(z.lazy(() => dataCenterCommentSchema)).optional(),
})

const dataCenterAnchorSchema = z.object({
  path: z.string(),
  line: z.number().optional(),
  lineType: z.string().optional(),
  fileType: z.string().optional(),
  orphaned: z.boolean().optional(),
  multilineMarker: z.object({ startLine: z.number() }).nullable().optional(),
})

export const dataCenterActivitySchema = z.object({
  id: z.number().optional(),
  action: z.string(),
  createdDate: z.number(),
  user: dataCenterUserSchema.optional(),
  commentAction: z.string().optional(),
  comment: dataCenterCommentSchema.optional(),
  commentAnchor: dataCenterAnchorSchema.optional(),
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

export type DataCenterAnchor = z.infer<typeof dataCenterAnchorSchema>

export type DataCenterCommit = z.infer<typeof dataCenterCommitSchema>
