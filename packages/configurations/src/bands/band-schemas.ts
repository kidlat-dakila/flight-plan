import { z } from "zod"
import { CARD_SIDES, FINDING_KINDS, IMPACT_TYPES, WAYPOINT_MARK_KINDS } from "@/artifact/kinds"
import { CODE_BLOCK_CLASSIFICATIONS, CODE_BLOCK_TYPES, type CodeBlockType } from "@/code-graph/code-blocks"
import { TOKEN_KINDS } from "./code-token"

export const WAYPOINT_FINDING_FILTER_KEYS = ["core-change", ...FINDING_KINDS] as const
export const WAYPOINT_CHANGES = ["added", "modified", "removed"] as const
export const WAYPOINT_FILTER_KEYS = [...WAYPOINT_FINDING_FILTER_KEYS, ...WAYPOINT_CHANGES] as const
export const ROOT_BLOCK_CHANGES = ["added", "modified", "deleted"] as const
export const NODE_CHANGES = ["added", "modified"] as const
export const NODE_BLOCK_LIST_KINDS = ["argument", "property", "state", "hook", "effect", "call", "step", "part"] as const
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

export const classificationViewSchema = z.strictObject({
  key: z.enum(CODE_BLOCK_CLASSIFICATIONS),
  label: z.string(),
})

export const spotlightViewSchema = z.strictObject({
  label: z.string(),
  classifications: z.array(classificationViewSchema),
})

export type SpotlightView = z.infer<typeof spotlightViewSchema>

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
  rangeLabel: z.string().nullable(),
  mark: z.strictObject({ kind: z.enum(WAYPOINT_MARK_KINDS), kindLabel: z.string(), label: z.string() }),
  previousId: z.string().nullable(),
  nextId: z.string().nullable(),
  chip: z.strictObject({ kind: z.enum(FINDING_KINDS), label: z.string() }).nullable(),
  coreChangeLabel: z.string().nullable(),
  reading: proseSchema.nullable(),
  unwrittenLabel: z.string(),
  hint: z.string().nullable(),
  isBeingWritten: z.boolean(),
  spotlight: spotlightViewSchema.nullable(),
  coreChange: proseSchema.nullable(),
  findings: z.array(findingSchema),
  isReviewed: z.boolean(),
  reviewLabel: z.string(),
  lines: z.strictObject({ lineStart: z.number(), lineEnd: z.number() }).nullable(),
  text: z.strictObject({ title: z.string(), reading: z.string(), coreChange: z.string().nullable() }),
})

export const lineCollapseSchema = z.strictObject({
  rootBlockId: z.string(),
  fromLine: z.number().int(),
  toLine: z.number().int(),
  hasTrigger: z.boolean(),
})

export const fileRowSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("lines"), id: z.string(), lines: z.array(codeLineSchema), collapses: z.array(lineCollapseSchema) }),
  z.strictObject({ kind: z.literal("gap"), id: z.string(), label: z.string(), rootBlockId: z.string().nullable() }),
  z.strictObject({ kind: z.literal("waypoint"), id: z.string(), waypoint: waypointSchema, rootBlockId: z.string().nullable() }),
])

export const codeUsageFileSchema = z.strictObject({
  pathLabel: z.string(),
  lines: z.array(codeLineSchema),
  forgeLink: linkSchema.nullable(),
})

export const codeDefinitionSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("declaration"),
    pathLabel: z.string(),
    rangeLabel: z.string(),
    description: proseSchema.nullable(),
    lines: z.array(codeLineSchema),
    note: z.string().nullable(),
    forgeLink: linkSchema.nullable(),
  }),
  z.strictObject({
    kind: z.literal("usages"),
    nameLabel: z.string(),
    countLabel: z.string(),
    files: z.array(codeUsageFileSchema),
    note: z.string().nullable(),
  }),
])

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

export const traceTriggerLabelSchema = z.strictObject({
  id: z.string(),
  type: z.enum(CODE_BLOCK_TYPES),
  typeLabel: z.string(),
  name: z.string(),
  label: z.string(),
  isDraft: z.boolean(),
  hint: z.string().nullable(),
  change: z.enum(NODE_CHANGES).nullable(),
  lines: z.array(lineSpanSchema),
})

export type TraceTriggerLabelView = z.infer<typeof traceTriggerLabelSchema>

export const traceBlockListSchema = z.strictObject({
  kind: z.enum(NODE_BLOCK_LIST_KINDS),
  label: z.string(),
  blocks: z.array(z.strictObject({ id: z.string(), name: z.string(), label: z.string(), isDraft: z.boolean(), hint: z.string().nullable(), change: z.enum(NODE_CHANGES).nullable(), lines: z.array(lineSpanSchema) })),
})

export type TraceBlockListView = z.infer<typeof traceBlockListSchema>

export const traceRowGroupSchema = z.strictObject({ label: z.string().nullable(), rowIds: z.array(z.string()), childIds: z.array(z.string()) })

export type TraceRowGroupView = z.infer<typeof traceRowGroupSchema>

export type ClassificationView = z.infer<typeof classificationViewSchema>

export interface TraceNodeView {
  id: string
  type: CodeBlockType
  typeLabel: string
  classification: ClassificationView
  change: NodeChange | null
  changedLabel: string | null
  label: string
  isDraft: boolean
  hint: string | null
  isBeingWritten: boolean
  name: string
  shortPath: string
  description: Prose | null
  codeLinkId: string | null
  codeViews: NodeCodeView[]
  parameters: string[]
  blockLists: TraceBlockListView[]
  triggerLabels: TraceTriggerLabelView[]
  rowGroups: TraceRowGroupView[]
  position: { x: number, y: number } | null
  children: TraceNodeView[]
}

export const traceNodeSchema: z.ZodType<TraceNodeView> = z.lazy(() =>
  z.strictObject({
    id: z.string(),
    type: z.enum(CODE_BLOCK_TYPES),
    typeLabel: z.string(),
    classification: classificationViewSchema,
    change: z.enum(NODE_CHANGES).nullable(),
    changedLabel: z.string().nullable(),
    label: z.string(),
    isDraft: z.boolean(),
    hint: z.string().nullable(),
    isBeingWritten: z.boolean(),
    name: z.string(),
    shortPath: z.string(),
    description: proseSchema.nullable(),
    codeLinkId: z.string().nullable(),
    codeViews: z.array(nodeCodeViewSchema),
    parameters: z.array(z.string()),
    blockLists: z.array(traceBlockListSchema),
    triggerLabels: z.array(traceTriggerLabelSchema),
    rowGroups: z.array(traceRowGroupSchema),
    position: pointSchema.nullable(),
    children: z.array(traceNodeSchema),
  }),
)

export const traceEdgeSchema = z.strictObject({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  fromRowId: z.string().nullable(),
  toRowId: z.string().nullable(),
  toSide: z.enum(CARD_SIDES),
})

export const traceDiagramViewSchema = z.strictObject({
  anchorId: z.string(),
  title: z.string(),
  description: proseSchema.nullable(),
  descriptionMarkdown: z.string(),
  descriptionHint: z.string().nullable(),
  unwrittenLabel: z.string(),
  nodes: z.array(traceNodeSchema),
  edges: z.array(traceEdgeSchema),
})

export const traceTabSchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  diagram: traceDiagramViewSchema,
})

export const traceBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  diagram: traceDiagramViewSchema.nullable(),
  tabs: z.array(traceTabSchema),
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
  isBeingWritten: z.boolean(),
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

export const rootBlockViewSchema = z.strictObject({
  id: z.string(),
  classification: classificationViewSchema,
  spotlight: spotlightViewSchema.nullable(),
  coreChangeLabel: z.string().nullable(),
  isReviewed: z.boolean(),
  isFoldedByFilter: z.boolean(),
  reviewLabel: z.string(),
  reviewName: z.string(),
  expandLabel: z.string(),
  collapseLabel: z.string(),
})

export const changeOverviewCardSchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  typeLabel: z.string(),
  path: z.string(),
  change: z.enum(ROOT_BLOCK_CHANGES),
  changeLabel: z.string(),
  waypointAnchorId: z.string().nullable(),
  preview: codeLinkSchema.nullable(),
})

export const changeOverviewRowSchema = z.strictObject({
  classification: classificationViewSchema,
  cards: z.array(changeOverviewCardSchema),
})

export const changeOverviewSchema = z.strictObject({
  heading: z.string(),
  emptyMessage: z.string().nullable(),
  rows: z.array(changeOverviewRowSchema),
})

export const fileSectionSchema = z.strictObject({
  anchorId: z.string(),
  path: z.string(),
  title: z.string(),
  isReviewed: z.boolean(),
  reviewLabel: z.string(),
  countLabels: z.array(z.string()),
  forgeLink: linkSchema.nullable(),
  rootBlocks: z.array(rootBlockViewSchema),
  rows: z.array(fileRowSchema),
})

const waypointFilterOptionSchema = z.strictObject({
  key: z.string(),
  label: z.string(),
  detailLabel: z.string(),
  detailChange: z.enum(ROOT_BLOCK_CHANGES).nullable(),
  isSelected: z.boolean(),
  toggledKeys: z.array(z.string()),
})

const waypointFilterSubmenuSchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  heading: z.string(),
  valueLabel: z.string().nullable(),
  options: z.array(waypointFilterOptionSchema),
})

export const waypointFilterSchema = z.strictObject({
  buttonLabel: z.string(),
  badge: z.strictObject({ count: z.number().int(), label: z.string() }).nullable(),
  heading: z.string(),
  groups: z.array(
    z.strictObject({
      id: z.string(),
      options: z.array(waypointFilterOptionSchema),
      more: waypointFilterSubmenuSchema.nullable(),
    }),
  ),
  submenus: z.array(waypointFilterSubmenuSchema),
})

export const walkthroughControlsSchema = z.strictObject({
  filter: waypointFilterSchema,
  reviewedToggle: z.strictObject({ label: z.string(), countLabel: z.string(), isShown: z.boolean(), isAvailable: z.boolean() }),
  stepping: z.strictObject({
    previousLabel: z.string(),
    nextLabel: z.string(),
  }),
  currentReview: z.strictObject({ markLabel: z.string(), reviewedLabel: z.string() }),
})

export const walkthroughBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  coverageLabel: z.string(),
  emptyMessage: z.string().nullable(),
  controls: walkthroughControlsSchema,
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

export type CodeLine = z.infer<typeof codeLineSchema>
export type Link = z.infer<typeof linkSchema>
export type CodeLink = z.infer<typeof codeLinkSchema>
export type CodeDefinition = z.infer<typeof codeDefinitionSchema>
export type NodeCodeView = z.infer<typeof nodeCodeViewSchema>
export type NodeChange = (typeof NODE_CHANGES)[number]
export type NodeBlockListKind = (typeof NODE_BLOCK_LIST_KINDS)[number]
export type TraceEdgeView = z.infer<typeof traceEdgeSchema>
export type TraceBand = z.infer<typeof traceBandSchema>
export type TraceDiagramView = z.infer<typeof traceDiagramViewSchema>
export type TraceTabView = z.infer<typeof traceTabSchema>
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
export type LineCollapse = z.infer<typeof lineCollapseSchema>
export type RootBlockView = z.infer<typeof rootBlockViewSchema>
export type ChangeOverview = z.infer<typeof changeOverviewSchema>
export type ChangeOverviewRow = z.infer<typeof changeOverviewRowSchema>
export type ChangeOverviewCard = z.infer<typeof changeOverviewCardSchema>
export type WaypointFilter = z.infer<typeof waypointFilterSchema>
export type WaypointFilterKey = (typeof WAYPOINT_FILTER_KEYS)[number]
export type WaypointChange = (typeof WAYPOINT_CHANGES)[number]
export type RootBlockChange = (typeof ROOT_BLOCK_CHANGES)[number]
export type WalkthroughControls = z.infer<typeof walkthroughControlsSchema>
export type WalkthroughBand = z.infer<typeof walkthroughBandSchema>
