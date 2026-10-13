import { z } from "zod"
import type { PendingComment } from "./discussion"
import { DIFF_SIDES } from "./schemas"

const storedPendingCommentsSchema = z.array(
  z.strictObject({
    id: z.string(),
    position: z.strictObject({
      path: z.string(),
      side: z.enum(DIFF_SIDES),
      startLine: z.number().int(),
      endLine: z.number().int(),
    }),
    body: z.string(),
    createdAt: z.iso.datetime().transform((text) => new Date(text)),
    commit: z.string(),
  }),
)

const NO_PENDING_COMMENTS: readonly PendingComment[] = []
const INDENT_WIDTH = 2

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const parseStoredPendingComments = (text: string): readonly PendingComment[] =>
  storedPendingCommentsSchema.safeParse(parseJson(text)).data ?? NO_PENDING_COMMENTS

export const formatStoredPendingComments = (pendingComments: readonly PendingComment[]): string =>
  `${JSON.stringify(pendingComments, null, INDENT_WIDTH)}\n`
