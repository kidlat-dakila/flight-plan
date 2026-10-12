import { parse, stringify } from "devalue"
import { z } from "zod"
import { AGENT_NAMES, PRESET_NAMES } from "@/procedures/get-setup/utils/setup"
import { reviewArtifactSchema, type ReviewArtifact } from "@flightplan/configurations"
import { AUTHOR_STARTS, WALKTHROUGH_ORDERS, type ReviewRequest } from "./start/review-request"

export interface ReviewScaffold {
  readonly artifact: ReviewArtifact
  readonly request: ReviewRequest
  readonly baseCommit: string
}

const STORED_SCHEMA_VERSION = 2

const requestSchema = z.strictObject({
  preset: z.enum(PRESET_NAMES),
  order: z.enum(WALKTHROUGH_ORDERS),
  customOrder: z.string().nullable(),
  writer: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("agent"), agent: z.enum(AGENT_NAMES), model: z.string(), effort: z.string() }),
    z.strictObject({ kind: z.literal("manual") }),
    z.strictObject({ kind: z.literal("author"), start: z.enum(AUTHOR_STARTS) }),
  ]),
  requestedAt: z.iso.datetime().transform((text) => new Date(text)),
})

const storedReviewSchema = z.strictObject({
  schema: z.literal(STORED_SCHEMA_VERSION),
  meta: z.strictObject({
    kind: z.literal("review"),
    baseCommit: z.string(),
    request: requestSchema,
  }),
  artifact: reviewArtifactSchema,
})

const parseStored = (text: string): unknown => {
  try {
    return parse(text)
  } catch {
    return null
  }
}

export const parseStoredReview = (text: string): ReviewScaffold | null => {
  const stored = storedReviewSchema.safeParse(parseStored(text))
  return stored.success
    ? { artifact: stored.data.artifact, request: stored.data.meta.request, baseCommit: stored.data.meta.baseCommit }
    : null
}

export const formatStoredReview = (scaffold: ReviewScaffold): string =>
  `${stringify(
    {
      schema: STORED_SCHEMA_VERSION,
      meta: {
        kind: "review",
        baseCommit: scaffold.baseCommit,
        request: { ...scaffold.request, requestedAt: scaffold.request.requestedAt.toISOString() },
      },
      artifact: scaffold.artifact,
    },
  )}\n`
