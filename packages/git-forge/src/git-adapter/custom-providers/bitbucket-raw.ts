import { z } from "zod"

const rawLinkSchema = z.object({ href: z.string().optional() })

export const rawAccountSchema = z.object({
  uuid: z.string().optional(),
  account_id: z.string().optional(),
  display_name: z.string().optional(),
  nickname: z.string().optional(),
  created_on: z.string().optional(),
  links: z.object({ avatar: rawLinkSchema.optional(), html: rawLinkSchema.optional() }).optional(),
})

const rawWorkspaceSchema = z.object({
  slug: z.string().optional(),
  links: z.object({ avatar: rawLinkSchema.optional() }).optional(),
})

const rawBranchPointSchema = z.object({
  branch: z.object({ name: z.string().optional() }).optional(),
  commit: z.object({ hash: z.string().optional() }).optional(),
})

export const rawPullRequestSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  state: z.string().optional(),
  draft: z.boolean().optional(),
  created_on: z.string().optional(),
  updated_on: z.string().optional(),
  author: rawAccountSchema.optional(),
  links: z.object({ html: rawLinkSchema.optional() }).optional(),
  source: rawBranchPointSchema.optional(),
  destination: rawBranchPointSchema.optional(),
  merge_commit: z.object({ hash: z.string().optional() }).nullable().optional(),
  reviewers: z.array(rawAccountSchema).optional(),
  participants: z
    .array(
      z.object({
        user: rawAccountSchema.optional(),
        role: z.string().optional(),
        approved: z.boolean().optional(),
        state: z.string().nullable().optional(),
        participated_on: z.string().nullable().optional(),
      }),
    )
    .optional(),
})

export const rawRepositorySchema = z.object({
  uuid: z.string().optional(),
  name: z.string().optional(),
  full_name: z.string(),
  description: z.string().optional(),
  is_private: z.boolean().optional(),
  mainbranch: z.object({ name: z.string().optional() }).nullable().optional(),
  links: z
    .object({
      html: rawLinkSchema.optional(),
      clone: z.array(z.object({ name: z.string().optional(), href: z.string().optional() })).optional(),
    })
    .optional(),
  parent: z
    .object({
      full_name: z.string().optional(),
      links: z.object({ html: rawLinkSchema.optional() }).optional(),
    })
    .nullable()
    .optional(),
  owner: rawAccountSchema.optional(),
  workspace: rawWorkspaceSchema.optional(),
})

export const rawIssueSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  content: z.object({ raw: z.string().optional() }).optional(),
  state: z.string().optional(),
  reporter: rawAccountSchema.optional(),
  assignee: rawAccountSchema.nullable().optional(),
  created_on: z.string().optional(),
  updated_on: z.string().optional(),
  links: z.object({ html: rawLinkSchema.optional() }).optional(),
})

export const rawCommitSchema = z.object({
  hash: z.string(),
  message: z.string().optional(),
  date: z.string().optional(),
  author: z.object({ raw: z.string().optional() }).optional(),
  parents: z.array(z.object({ hash: z.string() })).optional(),
  links: z.object({ html: rawLinkSchema.optional() }).optional(),
})

const rawDiffstatFileSchema = z.object({ path: z.string().optional() })

export const rawDiffstatSchema = z.object({
  status: z.string().optional(),
  lines_added: z.number().optional(),
  lines_removed: z.number().optional(),
  old: rawDiffstatFileSchema.nullable().optional(),
  new: rawDiffstatFileSchema.nullable().optional(),
})

export const rawCommentSchema = z.object({
  id: z.number(),
  content: z.object({ raw: z.string().optional() }).optional(),
  user: rawAccountSchema.optional(),
  created_on: z.string().optional(),
  updated_on: z.string().nullable().optional(),
  deleted: z.boolean().optional(),
  parent: z.object({ id: z.number() }).optional(),
  inline: z
    .object({
      path: z.string(),
      from: z.number().nullable().optional(),
      to: z.number().nullable().optional(),
      start_from: z.number().nullable().optional(),
      start_to: z.number().nullable().optional(),
      outdated: z.boolean().optional(),
    })
    .optional(),
  resolution: z.looseObject({}).nullable().optional(),
  links: z.object({ html: rawLinkSchema.optional() }).optional(),
})

export const rawActivityCommitSchema = z.object({ date: z.string().optional() })

export const rawActivityCommentSchema = z.object({ user: rawAccountSchema.optional(), created_on: z.string() })

export function pageSchema<Item extends z.ZodType>(item: Item): z.ZodObject<{
  values: z.ZodOptional<z.ZodArray<Item>>
  size: z.ZodOptional<z.ZodNumber>
  next: z.ZodOptional<z.ZodString>
}> {
  return z.object({ values: z.array(item).optional(), size: z.number().optional(), next: z.string().optional() })
}

export type RawAccount = z.infer<typeof rawAccountSchema>

export type RawWorkspace = z.infer<typeof rawWorkspaceSchema>

export type RawPullRequest = z.infer<typeof rawPullRequestSchema>

export type RawRepository = z.infer<typeof rawRepositorySchema>

export type RawIssue = z.infer<typeof rawIssueSchema>

export type RawCommit = z.infer<typeof rawCommitSchema>

export type RawDiffstat = z.infer<typeof rawDiffstatSchema>

export type RawComment = z.infer<typeof rawCommentSchema>

export interface RawThread {
  root: RawComment
  replies: RawComment[]
}

export interface RawActivity {
  comments: { login: string, at: string }[]
  commitDates: string[]
}

export interface RawPage { size?: number, next?: string }
