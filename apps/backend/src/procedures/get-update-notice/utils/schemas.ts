import { z } from "zod"

export const updateCheckSchema = z.strictObject({
  checkedAt: z.iso.datetime(),
  latestVersion: z.string(),
})

export type UpdateCheck = z.infer<typeof updateCheckSchema>

export const getUpdateNoticeInputSchema = z.strictObject({})

export type GetUpdateNoticeInput = z.infer<typeof getUpdateNoticeInputSchema>

export const updateNoticeSchema = z.strictObject({
  latestVersion: z.string(),
  runningVersion: z.string(),
  command: z.string(),
  title: z.string(),
  description: z.string(),
  copyLabel: z.string(),
  copiedLabel: z.string(),
  releaseNotesLabel: z.string(),
  releaseNotesUrl: z.url(),
  closeLabel: z.string(),
})

export type UpdateNotice = z.infer<typeof updateNoticeSchema>
