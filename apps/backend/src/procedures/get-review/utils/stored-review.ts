import { parse, stringify } from "devalue"
import { z } from "zod"
import { AGENT_NAMES, PRESET_NAMES } from "@/procedures/get-setup/utils/setup"
import { RENAMED_PARTS, withRenamedKeys } from "@/procedures/list-configurations/utils/renamed-parts"
import { reviewArtifactSchema, type ReviewArtifact } from "@flightplan/configurations"
import { AUTHOR_STARTS, WALKTHROUGH_ORDERS, type ReviewRequest } from "./start/review-request"

export interface ReviewScaffold {
  readonly artifact: ReviewArtifact
  readonly request: ReviewRequest
  readonly baseCommit: string
}

const STORED_SCHEMA_VERSION = 3
const JOURNEY_SCHEMA_VERSION = 2

const requestSchema = z.strictObject({
  configurationId: z.string().optional(),
  preset: z.enum(PRESET_NAMES),
  order: z.enum(WALKTHROUGH_ORDERS),
  customOrder: z.string().nullable(),
  writer: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("agent"), agent: z.enum(AGENT_NAMES), model: z.string(), effort: z.string() }),
    z.strictObject({ kind: z.literal("manual") }),
    z.strictObject({ kind: z.literal("author"), start: z.enum(AUTHOR_STARTS) }),
  ]),
  requestedAt: z.iso.datetime().transform((text) => new Date(text)),
}).transform((request) => ({ ...request, configurationId: request.configurationId ?? request.preset }))

const RETIRED_WALKTHROUGH_KEY = "intro"
const RETIRED_FILE_KEYS: readonly string[] = ["title", "summary"]

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const withoutKeys = (record: Readonly<Record<string, unknown>>, keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([name]) => !keys.includes(name)))

const withoutRetiredFileKeys = (file: unknown): unknown => (isRecord(file) ? withoutKeys(file, RETIRED_FILE_KEYS) : file)

const withoutRetiredWalkthroughKeys = (walkthrough: unknown): unknown =>
  isRecord(walkthrough) && Array.isArray(walkthrough.files)
    ? { ...withoutKeys(walkthrough, [RETIRED_WALKTHROUGH_KEY]), files: walkthrough.files.map(withoutRetiredFileKeys) }
    : walkthrough

const withoutRetiredSegmentKeys = (segment: unknown): unknown =>
  isRecord(segment) ? { ...segment, walkthrough: withoutRetiredWalkthroughKeys(segment.walkthrough) } : segment

const withoutRetiredKeys = (artifact: unknown): unknown =>
  isRecord(artifact) && Array.isArray(artifact.segments)
    ? { ...artifact, segments: artifact.segments.map(withoutRetiredSegmentKeys) }
    : artifact

const RENAMED_TRACE_DIAGRAM_KEYS: ReadonlyMap<string, string> = new Map([
  ["journeyNodes", "traceNodes"],
  ["journeyNodeEdges", "traceNodeEdges"],
])

const withRenamedTraceDiagram = (segment: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> =>
  isRecord(segment.traceDiagram)
    ? { ...segment, traceDiagram: withRenamedKeys(segment.traceDiagram, RENAMED_TRACE_DIAGRAM_KEYS) }
    : segment

const upgradedSegment = (segment: unknown): unknown =>
  isRecord(segment) ? withRenamedTraceDiagram(withRenamedKeys(segment, RENAMED_PARTS)) : segment

const upgradedSections = (artifact: Readonly<Record<string, unknown>>): Record<string, unknown> =>
  isRecord(artifact.sections) ? { sections: withRenamedKeys(artifact.sections, RENAMED_PARTS) } : {}

const upgradedArtifact = (artifact: unknown): unknown =>
  isRecord(artifact) && Array.isArray(artifact.segments)
    ? { ...artifact, ...upgradedSections(artifact), segments: artifact.segments.map(upgradedSegment) }
    : artifact

const upgradedStoredReview = (stored: unknown): unknown =>
  isRecord(stored) && stored.schema === JOURNEY_SCHEMA_VERSION
    ? { ...stored, schema: STORED_SCHEMA_VERSION, artifact: upgradedArtifact(stored.artifact) }
    : stored

const storedReviewSchema = z.strictObject({
  schema: z.literal(STORED_SCHEMA_VERSION),
  meta: z.strictObject({
    kind: z.literal("review"),
    baseCommit: z.string(),
    request: requestSchema,
  }),
  artifact: z.preprocess(withoutRetiredKeys, reviewArtifactSchema),
})

const parseStored = (text: string): unknown => {
  try {
    return parse(text)
  } catch {
    return null
  }
}

export const parseStoredReview = (text: string): ReviewScaffold | null => {
  const stored = storedReviewSchema.safeParse(upgradedStoredReview(parseStored(text)))
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
