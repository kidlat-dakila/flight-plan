import { z } from "zod"
import { isLogId } from "./log-id"

export const MAX_MESSAGE_LENGTH = 4000
export const MAX_STACK_LENGTH = 16_000
const MAX_PAGE_PATH_LENGTH = 2000
const MAX_PAGE_TITLE_LENGTH = 200

export const logIdSchema = z.string().refine(isLogId, "This is not a Flight Plan log id.")

export const pageSchema = z.strictObject({
  path: z.string().max(MAX_PAGE_PATH_LENGTH),
  title: z.string().max(MAX_PAGE_TITLE_LENGTH),
})

export const recordErrorInputSchema = z.strictObject({
  message: z.string().max(MAX_MESSAGE_LENGTH),
  stack: z.string().max(MAX_STACK_LENGTH).nullable(),
  page: pageSchema,
})

export const recordedErrorSchema = z.strictObject({ logId: z.string() })

export const errorEntrySchema = z.strictObject({
  kind: z.literal("error"),
  id: logIdSchema,
  recordedAt: z.iso.datetime(),
  source: z.string(),
  message: z.string(),
  stack: z.string().nullable(),
  version: z.string().nullable(),
  platform: z.string(),
})

export const troubleshootRequestSchema = z.strictObject({
  kind: z.literal("request"),
  id: logIdSchema,
  recordedAt: z.iso.datetime(),
  description: z.string(),
  shownError: z.string().nullable(),
  page: pageSchema,
  errorLogId: logIdSchema.nullable(),
  recentErrorLogIds: z.array(logIdSchema),
  agent: z.string().nullable(),
  version: z.string().nullable(),
  platform: z.string(),
})

export const logEntrySchema = z.discriminatedUnion("kind", [errorEntrySchema, troubleshootRequestSchema])

export type Page = z.infer<typeof pageSchema>
export type RecordErrorInput = z.infer<typeof recordErrorInputSchema>
export type RecordedError = z.infer<typeof recordedErrorSchema>
export type ErrorEntry = z.infer<typeof errorEntrySchema>
export type TroubleshootRequest = z.infer<typeof troubleshootRequestSchema>
export type LogEntry = z.infer<typeof logEntrySchema>
