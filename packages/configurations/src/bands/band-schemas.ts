import { z } from "zod"
import { CHANGE_TYPES, FINDING_KINDS, NODE_CATEGORIES } from "@/artifact/kinds"
import { TOKEN_KINDS } from "./code-token"

export const WAYPOINT_FILTER_KEYS = ["attention", ...FINDING_KINDS] as const
export const NODE_CHANGES = ["added", "modified"] as const
export const BLAST_VERDICTS = ["changed", "breaks", "behaviour-changes", "unaffected", "unassessed"] as const

const codeTokenSchema = z.strictObject({ text: z.string(), kind: z.enum(TOKEN_KINDS) })

export const codeLineSchema = z.strictObject({
  numberLabel: z.string(),
  mark: z.enum(["context", "added", "removed"]),
  isFocused: z.boolean(),
  tokens: z.array(codeTokenSchema),
})

export const inlineSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("text"), text: z.string() }),
  z.strictObject({ kind: z.literal("code"), text: z.string() }),
  z.strictObject({ kind: z.literal("strong"), text: z.string() }),
  z.strictObject({
    kind: z.literal("code-link"),
    text: z.string(),
    isCode: z.boolean(),
    linkId: z.string().nullable(),
  }),
])

export const inlinesSchema = z.array(inlineSchema)

export const proseSchema = z.array(
  z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("heading"), inlines: inlinesSchema }),
    z.strictObject({ kind: z.literal("paragraph"), inlines: inlinesSchema }),
    z.strictObject({ kind: z.literal("list"), isOrdered: z.boolean(), items: z.array(inlinesSchema) }),
  ]),
)

export const linkSchema = z.strictObject({ href: z.string(), label: z.string() })

export const codeLinkSchema = z.strictObject({
  pathLabel: z.string(),
  rangeLabel: z.string(),
  lines: z.array(codeLineSchema),
  anchorId: z.string().nullable(),
  forgeLink: linkSchema.nullable(),
})

const pointSchema = z.strictObject({ x: z.number(), y: z.number() })

const boxShape = { x: z.number(), y: z.number(), width: z.number(), height: z.number() }

export const journeyNodeSchema = z.strictObject({
  id: z.string(),
  ...boxShape,
  kind: z.enum(["entry-point", "code"]),
  change: z.enum(NODE_CHANGES).nullable(),
  category: z.enum(NODE_CATEGORIES).nullable(),
  kindLabel: z.string(),
  changedLabel: z.string().nullable(),
  label: z.string(),
  isDraft: z.boolean(),
  sublabel: z.string().nullable(),
  description: proseSchema.nullable(),
  codeLinkId: z.string().nullable(),
  tracedCode: codeLinkSchema.nullable(),
  tracedHeading: z.string().nullable(),
  isInsideCard: z.boolean(),
})

export const journeyEdgeSchema = z.strictObject({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  points: z.array(pointSchema),
  isInsideCard: z.boolean(),
})

const uiDataSchema = z.strictObject({ name: z.string(), changeType: z.enum(CHANGE_TYPES) })

export const uiFrameSchema = z.strictObject({
  key: z.string(),
  nodeId: z.string().nullable(),
  ...boxShape,
  depth: z.number().int(),
  label: z.string(),
  isDraft: z.boolean(),
  conditionLabel: z.string().nullable(),
  change: z.enum(NODE_CHANGES).nullable(),
  changedLabel: z.string().nullable(),
  data: z.array(uiDataSchema),
  hiddenDataLabel: z.string().nullable(),
  hasLineOut: z.boolean(),
  hasLineIn: z.boolean(),
})

export const uiTriggerSchema = z.strictObject({
  key: z.string(),
  entryPointId: z.string(),
  eventNodeId: z.string(),
  ...boxShape,
  label: z.string(),
  sublabel: z.string(),
})

export const uiCardSchema = z.strictObject({
  id: z.string(),
  ...boxShape,
  kindLabel: z.string(),
  label: z.string(),
  sublabel: z.string(),
  frames: z.array(uiFrameSchema),
  triggers: z.array(uiTriggerSchema),
})

export const journeyBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  diagram: z
    .strictObject({
      anchorId: z.string(),
      title: z.string(),
      summaryLabel: z.string(),
      width: z.number(),
      height: z.number(),
      nodes: z.array(journeyNodeSchema),
      uiCards: z.array(uiCardSchema),
      edges: z.array(journeyEdgeSchema),
    })
    .nullable(),
})

export const blastNodeSchema = z.strictObject({
  id: z.string(),
  ...boxShape,
  verdict: z.enum(BLAST_VERDICTS),
  verdictLabel: z.string(),
  label: z.string(),
  isDraft: z.boolean(),
  shieldLabel: z.string().nullable(),
  contract: z
    .strictObject({
      beforeLabel: z.string(),
      before: proseSchema.nullable(),
      absentLabel: z.string(),
      nowLabel: z.string(),
      now: proseSchema,
    })
    .nullable(),
  effect: proseSchema.nullable(),
  codeLinkId: z.string().nullable(),
})

export const blastEdgeSchema = z.strictObject({
  id: z.string(),
  kind: z.enum(["call", "value", "data"]),
  isAssumed: z.boolean(),
  route: z.enum(["across", "within"]),
  points: z.array(pointSchema),
})

export const blastBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  absence: proseSchema.nullable(),
  summary: z.array(z.strictObject({ verdict: z.enum(BLAST_VERDICTS), label: z.string() })),
  summaryLabel: z.string(),
  board: z
    .strictObject({
      width: z.number(),
      height: z.number(),
      zones: z.array(z.strictObject({ label: z.string(), x: z.number(), width: z.number() })),
      files: z.array(z.strictObject({ id: z.string(), label: z.string(), ...boxShape })),
      nodes: z.array(blastNodeSchema),
      edges: z.array(blastEdgeSchema),
    })
    .nullable(),
})

export const findingSchema = z.strictObject({
  id: z.string(),
  kind: z.enum(FINDING_KINDS),
  kindLabel: z.string(),
  title: inlinesSchema,
  reading: proseSchema,
  traceLabel: z.string(),
  trace: z.array(inlinesSchema).nullable(),
  solution: z
    .strictObject({ showLabel: z.string(), hideLabel: z.string(), lines: z.array(codeLineSchema) })
    .nullable(),
})

export const waypointSchema = z.strictObject({
  id: z.string(),
  anchorId: z.string(),
  depth: z.number(),
  title: z.string(),
  isDraft: z.boolean(),
  positionLabel: z.string(),
  previousId: z.string().nullable(),
  nextId: z.string().nullable(),
  chip: z.strictObject({ kind: z.enum(FINDING_KINDS), label: z.string() }).nullable(),
  attentionLabel: z.string().nullable(),
  reading: proseSchema.nullable(),
  unwrittenLabel: z.string(),
  needsAttention: proseSchema.nullable(),
  findings: z.array(findingSchema),
  isReviewed: z.boolean(),
  reviewLabel: z.string(),
})

export const fileRowSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("lines"), id: z.string(), lines: z.array(codeLineSchema) }),
  z.strictObject({ kind: z.literal("gap"), id: z.string(), label: z.string() }),
  z.strictObject({ kind: z.literal("waypoint"), id: z.string(), waypoint: waypointSchema }),
])

export const fileSectionSchema = z.strictObject({
  anchorId: z.string(),
  path: z.string(),
  title: z.string(),
  isReviewed: z.boolean(),
  reviewLabel: z.string(),
  summary: z.array(proseSchema),
  waypointCountLabel: z.string(),
  forgeLink: linkSchema.nullable(),
  rows: z.array(fileRowSchema),
})

export const waypointFilterSchema = z.strictObject({
  buttonLabel: z.string(),
  isDefault: z.boolean(),
  resetLabel: z.string(),
  options: z.array(
    z.strictObject({
      key: z.enum(WAYPOINT_FILTER_KEYS),
      label: z.string(),
      countLabel: z.string(),
      isSelected: z.boolean(),
      toggledKeys: z.array(z.enum(WAYPOINT_FILTER_KEYS)),
    }),
  ),
})

export const walkthroughBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  intro: proseSchema.nullable(),
  coverageLabel: z.string(),
  emptyMessage: z.string().nullable(),
  files: z.array(fileSectionSchema),
})

export const walkthroughControlsSchema = z.strictObject({
  filter: waypointFilterSchema,
  reviewedToggle: z.strictObject({ label: z.string(), isShown: z.boolean(), isAvailable: z.boolean() }),
  stepping: z.strictObject({
    firstWaypointId: z.string().nullable(),
    lastWaypointId: z.string().nullable(),
    idleLabel: z.string(),
    previousLabel: z.string(),
    nextLabel: z.string(),
  }),
})

export type CodeLine = z.infer<typeof codeLineSchema>
export type Inline = z.infer<typeof inlineSchema>
export type Prose = z.infer<typeof proseSchema>
export type Link = z.infer<typeof linkSchema>
export type CodeLink = z.infer<typeof codeLinkSchema>
export type JourneyNodeView = z.infer<typeof journeyNodeSchema>
export type NodeChange = (typeof NODE_CHANGES)[number]
export type JourneyEdgeView = z.infer<typeof journeyEdgeSchema>
export type UiFrameView = z.infer<typeof uiFrameSchema>
export type UiTriggerView = z.infer<typeof uiTriggerSchema>
export type UiCardView = z.infer<typeof uiCardSchema>
export type JourneyBand = z.infer<typeof journeyBandSchema>
export type BlastNodeView = z.infer<typeof blastNodeSchema>
export type BlastEdgeView = z.infer<typeof blastEdgeSchema>
export type BlastBand = z.infer<typeof blastBandSchema>
export type BlastVerdict = (typeof BLAST_VERDICTS)[number]
export type FindingView = z.infer<typeof findingSchema>
export type WaypointView = z.infer<typeof waypointSchema>
export type FileRow = z.infer<typeof fileRowSchema>
export type FileSectionView = z.infer<typeof fileSectionSchema>
export type WaypointFilter = z.infer<typeof waypointFilterSchema>
export type WaypointFilterKey = (typeof WAYPOINT_FILTER_KEYS)[number]
export type WalkthroughControls = z.infer<typeof walkthroughControlsSchema>
export type WalkthroughBand = z.infer<typeof walkthroughBandSchema>
