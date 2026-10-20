import { stringify, unflatten } from "devalue"
import { z } from "zod"
import { WALKTHROUGH_ORDERS as SORTED_WALKTHROUGH_ORDERS, WRITE_UP_SECTIONS } from "@/procedures/get-review-preferences/utils/review-preferences"
import { AGENT_NAMES, PRESET_NAMES } from "@/procedures/get-setup/utils/setup"
import { RENAMED_PARTS, withRenamedKeys } from "@/procedures/list-configurations/utils/renamed-parts"
import { withRequiredSections } from "@/procedures/read-artifact/utils/required-nodes"
import { reviewArtifactSchema, type ReviewArtifact } from "@flightplan/configurations"
import { AUTHOR_STARTS, isWrittenByAgent, WALKTHROUGH_ORDERS, type ReviewRequest } from "./start/review-request"
import { withCurrentClassifications } from "./stored-classifications"

export interface ReviewScaffold {
  readonly artifact: ReviewArtifact
  readonly request: ReviewRequest
  readonly baseCommit: string
}

const STORED_SCHEMA_VERSION = 4
const PRE_REQUIREMENT_SCHEMA_VERSION = 3
const RETIRED_MANUAL_WRITER = "manual"
const NO_AGENT_WRITER = { kind: "none" } as const
const JOURNEY_SCHEMA_VERSION = 2

const requestSchema = z.strictObject({
  configurationId: z.string().optional(),
  preset: z.enum(PRESET_NAMES),
  order: z.enum(WALKTHROUGH_ORDERS),
  customOrder: z.string().nullable(),
  writer: z.union([
    z.strictObject({ kind: z.literal("agent"), agent: z.enum(AGENT_NAMES), model: z.string(), effort: z.string() }),
    z.strictObject({ kind: z.literal("external"), agent: z.enum(AGENT_NAMES) }),
    z.strictObject({ kind: z.literal("none") }),
    z.strictObject({ kind: z.literal(RETIRED_MANUAL_WRITER) }).transform(() => NO_AGENT_WRITER),
    z.strictObject({ kind: z.literal("author"), start: z.enum(AUTHOR_STARTS) }),
  ]),
  requestedAt: z.iso.datetime().transform((text) => new Date(text)),
  writeUp: z.strictObject({
    sections: z.array(z.enum(WRITE_UP_SECTIONS)),
    walkthroughOrder: z.enum(SORTED_WALKTHROUGH_ORDERS),
  }).optional(),
  isWriteUpDeclined: z.boolean().optional(),
}).transform((request) => ({ ...request, configurationId: request.configurationId ?? request.preset }))

const RETIRED_ARTIFACT_KEYS: readonly string[] = ["sections"]
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
    ? { ...withoutKeys(artifact, RETIRED_ARTIFACT_KEYS), segments: artifact.segments.map(withoutRetiredSegmentKeys) }
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

const upgradedArtifact = (artifact: unknown): unknown =>
  isRecord(artifact) && Array.isArray(artifact.segments)
    ? { ...artifact, segments: artifact.segments.map(upgradedSegment) }
    : artifact

const upgradedStoredReview = (stored: unknown): unknown =>
  isRecord(stored) && stored.schema === JOURNEY_SCHEMA_VERSION
    ? { ...stored, schema: PRE_REQUIREMENT_SCHEMA_VERSION, artifact: upgradedArtifact(stored.artifact) }
    : stored

const storedReviewSchema = z.strictObject({
  schema: z.union([z.literal(PRE_REQUIREMENT_SCHEMA_VERSION), z.literal(STORED_SCHEMA_VERSION)]),
  meta: z.strictObject({
    kind: z.literal("review"),
    baseCommit: z.string(),
    request: requestSchema,
  }),
  artifact: z.preprocess(withoutRetiredKeys, reviewArtifactSchema),
})

const unflattenedOf = (flat: unknown): unknown => (Array.isArray(flat) ? unflatten([...withCurrentClassifications(flat)]) : null)

const parseStored = (text: string): unknown => {
  try {
    return unflattenedOf(JSON.parse(text))
  } catch {
    return null
  }
}

const withRequirementOf = (artifact: ReviewArtifact, request: ReviewRequest, schema: number): ReviewArtifact =>
  schema === PRE_REQUIREMENT_SCHEMA_VERSION && isWrittenByAgent(request.writer)
    ? withRequiredSections(artifact, WRITE_UP_SECTIONS)
    : artifact

export const parseStoredReview = (text: string): ReviewScaffold | null => {
  const stored = storedReviewSchema.safeParse(upgradedStoredReview(parseStored(text)))
  if (!stored.success) return null
  const { schema, meta, artifact } = stored.data
  return { artifact: withRequirementOf(artifact, meta.request, schema), request: meta.request, baseCommit: meta.baseCommit }
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
