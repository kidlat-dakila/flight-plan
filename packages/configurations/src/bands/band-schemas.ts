import { z } from "zod"
import { CARD_SIDES, FINDING_KINDS, IMPACT_TYPES } from "@/artifact/kinds"
import { CODE_BLOCK_TYPES, type CodeBlockType } from "@/code-graph/code-blocks"
import { TOKEN_KINDS } from "./code-token"

export const WAYPOINT_FILTER_KEYS = ["attention", ...FINDING_KINDS] as const
export const NODE_CHANGES = ["added", "modified"] as const
export const NODE_BLOCK_LIST_KINDS = ["argument", "state", "hook", "effect", "call", "step"] as const
export const BLAST_FILE_MARKS = ["added", "modified", "deleted", "breaks", "behaviour-changes", "plain"] as const
export const BLAST_VIEW_IDS = ["export-bound", "import-bound"] as const
export const BLAST_IMPACT_CHOICES = [...IMPACT_TYPES, "unassessed"] as const

const codeTokenSchema = z.strictObject({ text: z.string(), kind: z.enum(TOKEN_KINDS) })

const columnSpanShape = { fromColumn: z.number().int(), toColumn: z.number().int() }

export const codeLineSchema = z.strictObject({
  numberLabel: z.string(),
  removedNumberLabel: z.string(),
  mark: z.enum(["context", "added", "removed"]),
  isFocused: z.boolean(),
  tokens: z.array(codeTokenSchema),
  marks: z.array(z.strictObject(columnSpanShape)),
  references: z.array(z.strictObject({ ...columnSpanShape, definitionId: z.string() })),
})

export const inlineSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("text"), text: z.string() }),
  z.strictObject({ kind: z.literal("code"), text: z.string() }),
  z.strictObject({ kind: z.literal("strong"), text: z.string() }),
  z.strictObject({ kind: z.literal("emphasis"), text: z.string() }),
  z.strictObject({ kind: z.literal("link"), text: z.string(), href: z.string() }),
  z.strictObject({
    kind: z.literal("code-link"),
    text: z.string(),
    isCode: z.boolean(),
    linkId: z.string().nullable(),
  }),
])

export const inlinesSchema = z.array(inlineSchema)

export type Inline = z.infer<typeof inlineSchema>

export interface ProseListItem {
  inlines: Inline[]
  blocks: ProseBlock[]
}

export interface ProseTab {
  label: string
  blocks: ProseBlock[]
}

export interface ProseSection {
  label: string
  blocks: ProseBlock[]
}

export type ProseBlock
  = | { kind: "heading", inlines: Inline[] }
    | { kind: "paragraph", inlines: Inline[] }
    | { kind: "list", isOrdered: boolean, items: ProseListItem[] }
    | { kind: "quote", blocks: ProseBlock[] }
    | { kind: "code-block", language: string | null, text: string }
    | { kind: "tabs", tabs: ProseTab[] }
    | { kind: "accordion", sections: ProseSection[] }

export type Prose = ProseBlock[]

export const proseSchema: z.ZodType<Prose> = z.array(
  z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("heading"), inlines: inlinesSchema }),
    z.strictObject({ kind: z.literal("paragraph"), inlines: inlinesSchema }),
    z.strictObject({
      kind: z.literal("list"),
      isOrdered: z.boolean(),
      items: z.array(z.strictObject({ inlines: inlinesSchema, blocks: z.lazy(() => proseSchema) })),
    }),
    z.strictObject({ kind: z.literal("quote"), blocks: z.lazy(() => proseSchema) }),
    z.strictObject({ kind: z.literal("code-block"), language: z.string().nullable(), text: z.string() }),
    z.strictObject({
      kind: z.literal("tabs"),
      tabs: z.array(z.strictObject({ label: z.string(), blocks: z.lazy(() => proseSchema) })),
    }),
    z.strictObject({
      kind: z.literal("accordion"),
      sections: z.array(z.strictObject({ label: z.string(), blocks: z.lazy(() => proseSchema) })),
    }),
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
  lines: z.strictObject({ lineStart: z.number(), lineEnd: z.number() }).nullable(),
  text: z.strictObject({ title: z.string(), reading: z.string(), needsAttention: z.string().nullable() }),
})

export const fileRowSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("lines"), id: z.string(), lines: z.array(codeLineSchema) }),
  z.strictObject({ kind: z.literal("gap"), id: z.string(), label: z.string() }),
  z.strictObject({ kind: z.literal("waypoint"), id: z.string(), waypoint: waypointSchema }),
])

export const codeDefinitionSchema = z.strictObject({
  pathLabel: z.string(),
  rangeLabel: z.string(),
  description: proseSchema.nullable(),
  lines: z.array(codeLineSchema),
  note: z.string().nullable(),
  forgeLink: linkSchema.nullable(),
})

export const nodeCodeViewSchema = z.strictObject({
  id: z.string(),
  heading: z.string(),
  countLabel: z.string().nullable(),
  pathLabel: z.string(),
  rangeLabel: z.string(),
  rows: z.array(fileRowSchema),
  note: z.string().nullable(),
  forgeLink: linkSchema.nullable(),
})

const pointSchema = z.strictObject({ x: z.number(), y: z.number() })

const lineSpanSchema = z.tuple([z.number(), z.number()]).readonly()

export const journeyTriggerLabelSchema = z.strictObject({
  id: z.string(),
  type: z.enum(CODE_BLOCK_TYPES),
  typeLabel: z.string(),
  name: z.string(),
  label: z.string(),
  isDraft: z.boolean(),
  change: z.enum(NODE_CHANGES).nullable(),
  lines: z.array(lineSpanSchema),
})

export type JourneyTriggerLabelView = z.infer<typeof journeyTriggerLabelSchema>

export const journeyBlockListSchema = z.strictObject({
  kind: z.enum(NODE_BLOCK_LIST_KINDS),
  label: z.string(),
  blocks: z.array(z.strictObject({ id: z.string(), name: z.string(), label: z.string(), isDraft: z.boolean(), change: z.enum(NODE_CHANGES).nullable(), lines: z.array(lineSpanSchema) })),
})

export type JourneyBlockListView = z.infer<typeof journeyBlockListSchema>

export const journeyRowGroupSchema = z.strictObject({ label: z.string().nullable(), rowIds: z.array(z.string()) })

export type JourneyRowGroupView = z.infer<typeof journeyRowGroupSchema>

export interface JourneyNodeView {
  id: string
  type: CodeBlockType
  typeLabel: string
  change: NodeChange | null
  changedLabel: string | null
  label: string
  isDraft: boolean
  name: string
  shortPath: string
  description: Prose | null
  codeLinkId: string | null
  codeViews: NodeCodeView[]
  blockLists: JourneyBlockListView[]
  triggerLabels: JourneyTriggerLabelView[]
  rowGroups: JourneyRowGroupView[]
  position: { x: number, y: number } | null
  children: JourneyNodeView[]
}

export const journeyNodeSchema: z.ZodType<JourneyNodeView> = z.lazy(() =>
  z.strictObject({
    id: z.string(),
    type: z.enum(CODE_BLOCK_TYPES),
    typeLabel: z.string(),
    change: z.enum(NODE_CHANGES).nullable(),
    changedLabel: z.string().nullable(),
    label: z.string(),
    isDraft: z.boolean(),
    name: z.string(),
    shortPath: z.string(),
    description: proseSchema.nullable(),
    codeLinkId: z.string().nullable(),
    codeViews: z.array(nodeCodeViewSchema),
    blockLists: z.array(journeyBlockListSchema),
    triggerLabels: z.array(journeyTriggerLabelSchema),
    rowGroups: z.array(journeyRowGroupSchema),
    position: pointSchema.nullable(),
    children: z.array(journeyNodeSchema),
  }),
)

export const journeyEdgeSchema = z.strictObject({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  fromRowId: z.string().nullable(),
  toRowId: z.string().nullable(),
  toSide: z.enum(CARD_SIDES),
})

export const journeyBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  diagram: z
    .strictObject({
      anchorId: z.string(),
      title: z.string(),
      description: proseSchema.nullable(),
      descriptionMarkdown: z.string(),
      unwrittenLabel: z.string(),
      nodes: z.array(journeyNodeSchema),
      edges: z.array(journeyEdgeSchema),
    })
    .nullable(),
})

const blastFileRowSchema = z.strictObject({ id: z.string(), label: z.string() })

export const blastNodeSchema = z.strictObject({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  radius: z.number(),
  mark: z.enum(BLAST_FILE_MARKS),
  markLabel: z.string(),
  label: z.string(),
  path: z.string(),
  impactReason: proseSchema.nullable(),
  impactNote: z.string().nullable(),
  isUnassessed: z.boolean(),
  assessment: z.strictObject({ impactType: z.enum(BLAST_IMPACT_CHOICES), impactReason: z.string() }).nullable(),
  importers: z.strictObject({ heading: z.string(), emptyLabel: z.string(), files: z.array(blastFileRowSchema) }),
  imports: z.strictObject({ heading: z.string(), emptyLabel: z.string(), files: z.array(blastFileRowSchema) }),
  fileLink: z.strictObject({ anchorId: z.string(), label: z.string() }).nullable(),
})

export const blastEdgeSchema = z.strictObject({
  id: z.string(),
  importerId: z.string(),
  importedId: z.string(),
  points: z.array(pointSchema),
})

export const blastViewSchema = z.strictObject({
  id: z.enum(BLAST_VIEW_IDS),
  label: z.string(),
  description: z.string(),
  summary: z.array(z.string()),
  legend: z.array(z.strictObject({ mark: z.enum(BLAST_FILE_MARKS), label: z.string() })),
  edgeLegendLabel: z.string(),
  board: z.strictObject({
    width: z.number(),
    height: z.number(),
    nodes: z.array(blastNodeSchema),
    edges: z.array(blastEdgeSchema),
  }),
})

export const blastBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  defaultViewId: z.enum(BLAST_VIEW_IDS),
  assessmentForm: z.strictObject({
    editLabel: z.string(),
    impactTypeLabel: z.string(),
    impactReasonLabel: z.string(),
    choices: z.array(z.strictObject({ value: z.enum(BLAST_IMPACT_CHOICES), label: z.string(), hasReason: z.boolean() })),
  }),
  views: z.array(blastViewSchema).min(1),
})

export const fileSectionSchema = z.strictObject({
  anchorId: z.string(),
  path: z.string(),
  title: z.string(),
  isReviewed: z.boolean(),
  reviewLabel: z.string(),
  forgeLink: linkSchema.nullable(),
  rows: z.array(fileRowSchema),
})

export const waypointFilterSchema = z.strictObject({
  buttonLabel: z.string(),
  valueLabel: z.string().nullable(),
  heading: z.string(),
  hint: z.string(),
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
  coverageLabel: z.string(),
  emptyMessage: z.string().nullable(),
  files: z.array(fileSectionSchema),
  fileOrder: z.array(
    z.strictObject({
      path: z.string(),
      heading: z.string(),
      detailLabel: z.string(),
      canMoveUp: z.boolean(),
      canMoveDown: z.boolean(),
    }),
  ),
})

export const walkthroughControlsSchema = z.strictObject({
  filter: waypointFilterSchema,
  reviewedToggle: z.strictObject({ label: z.string(), countLabel: z.string(), isShown: z.boolean(), isAvailable: z.boolean() }),
  stepping: z.strictObject({
    firstWaypointId: z.string().nullable(),
    lastWaypointId: z.string().nullable(),
    previousLabel: z.string(),
    nextLabel: z.string(),
  }),
  currentReview: z.strictObject({ markLabel: z.string(), reviewedLabel: z.string() }),
})

export type CodeLine = z.infer<typeof codeLineSchema>
export type Link = z.infer<typeof linkSchema>
export type CodeLink = z.infer<typeof codeLinkSchema>
export type CodeDefinition = z.infer<typeof codeDefinitionSchema>
export type NodeCodeView = z.infer<typeof nodeCodeViewSchema>
export type NodeChange = (typeof NODE_CHANGES)[number]
export type NodeBlockListKind = (typeof NODE_BLOCK_LIST_KINDS)[number]
export type JourneyEdgeView = z.infer<typeof journeyEdgeSchema>
export type JourneyBand = z.infer<typeof journeyBandSchema>
export type BlastNodeView = z.infer<typeof blastNodeSchema>
export type BlastEdgeView = z.infer<typeof blastEdgeSchema>
export type BlastBand = z.infer<typeof blastBandSchema>
export type BlastView = z.infer<typeof blastViewSchema>
export type BlastFileMark = (typeof BLAST_FILE_MARKS)[number]
export type BlastImpactChoice = (typeof BLAST_IMPACT_CHOICES)[number]
export type FindingView = z.infer<typeof findingSchema>
export type WaypointView = z.infer<typeof waypointSchema>
export type FileRow = z.infer<typeof fileRowSchema>
export type FileSectionView = z.infer<typeof fileSectionSchema>
export type WaypointFilter = z.infer<typeof waypointFilterSchema>
export type WaypointFilterKey = (typeof WAYPOINT_FILTER_KEYS)[number]
export type WalkthroughControls = z.infer<typeof walkthroughControlsSchema>
export type WalkthroughBand = z.infer<typeof walkthroughBandSchema>
