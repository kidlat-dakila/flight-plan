import { z } from "zod"
import {
  ARTIFACT_STATUSES,
  CONNECTION_CERTAINTIES,
  CONNECTION_KINDS,
  FINDING_KINDS,
  LINE_MARKS,
  NODE_CATEGORIES,
  WRITTEN_VERDICTS,
} from "./kinds"
import type { Waypoint } from "./review-artifact"

const lineRangeSchema = z.strictObject({ lineStart: z.number().int(), lineEnd: z.number().int() })

const findingSchema = z.strictObject({
  id: z.string(),
  kind: z.enum(FINDING_KINDS),
  title: z.string(),
  reading: z.string(),
  trace: z.array(z.string()).nullable(),
  solution: z.string().nullable(),
})

const waypointSchema: z.ZodType<Waypoint> = z.lazy(() =>
  z.strictObject({
    id: z.string(),
    title: z.string().nullable(),
    declaration: z.string(),
    reading: z.string(),
    needsAttention: z.string().nullable(),
    findings: z.array(findingSchema),
    children: z.array(waypointSchema),
  }),
)

const journeyNodeSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("entry-point"),
    id: z.string(),
    label: z.string(),
    description: z.string().nullable(),
  }),
  z.strictObject({
    kind: z.literal("declaration"),
    id: z.string(),
    path: z.string(),
    declaration: z.string(),
    isChanged: z.boolean(),
    category: z.enum(NODE_CATEGORIES),
    label: z.string().nullable(),
    description: z.string().nullable(),
  }),
])

const journeySchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  nodes: z.array(journeyNodeSchema),
  edges: z.array(
    z.strictObject({
      from: z.string(),
      to: z.string(),
      kind: z.enum([...CONNECTION_KINDS, "trigger"]),
      certainty: z.enum(CONNECTION_CERTAINTIES),
    }),
  ),
})

const blastSchema = z.strictObject({
  nodes: z.array(
    z.strictObject({
      id: z.string(),
      ring: z.number().int(),
      path: z.string(),
      declaration: z.string(),
      label: z.string().nullable(),
      contract: z.strictObject({ before: z.string().nullable(), now: z.string() }).nullable(),
      verdict: z.enum(WRITTEN_VERDICTS).nullable(),
      effect: z.string().nullable(),
    }),
  ),
  edges: z.array(
    z.strictObject({
      from: z.string(),
      to: z.string(),
      kind: z.enum(CONNECTION_KINDS),
      certainty: z.enum(CONNECTION_CERTAINTIES),
    }),
  ),
})

const segmentSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  changedPaths: z.array(z.string()),
  context: z.strictObject({
    context: z.string(),
    overview: z.array(z.strictObject({ when: z.string(), then: z.string() })),
    implementation: z.array(z.strictObject({ label: z.string(), items: z.array(z.string()) })),
  }),
  journey: journeySchema.nullable(),
  journeyAbsence: z.string().nullable(),
  blast: blastSchema.nullable(),
  blastAbsence: z.string().nullable(),
  walkthrough: z.strictObject({
    intro: z.string().nullable(),
    files: z.array(
      z.strictObject({
        path: z.string(),
        title: z.string(),
        summary: z.array(z.string()),
        waypoints: z.array(waypointSchema),
      }),
    ),
  }),
})

export const reviewArtifactSchema = z.strictObject({
  title: z.string(),
  status: z.enum(ARTIFACT_STATUSES),
  commit: z.string(),
  isSegmented: z.boolean(),
  segments: z.array(segmentSchema),
  sources: z.array(
    z.strictObject({
      path: z.string(),
      language: z.string(),
      lines: z.array(
        z.strictObject({
          text: z.string(),
          mark: z.enum(LINE_MARKS),
          number: z.number().int().nullable(),
        }),
      ),
      declarations: z.record(z.string(), lineRangeSchema),
    }),
  ),
  changedPaths: z.array(z.string()),
})
