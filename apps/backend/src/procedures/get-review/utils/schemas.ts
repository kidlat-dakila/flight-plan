import { z } from "zod"
import { modelOptionSchema } from "@/procedures/get-setup/utils/schemas"
import { AGENT_NAMES, PRESET_NAMES } from "@/procedures/get-setup/utils/setup"
import { BRANCH_STATUSES } from "@/procedures/list-repositories/utils/branch-status"
import { LINE_COLORS } from "@/procedures/list-repositories/utils/line-color"
import { labelSegmentSchema } from "@/procedures/list-repositories/utils/schemas"
import { TOKEN_KINDS } from "./code/highlighter"
import { MANUAL_WRITER } from "./start/agent-offers"
import { WALKTHROUGH_ORDERS } from "./start/review-request"

export const FINDING_KINDS = ["bug", "risk", "nit", "question"] as const
export const WAYPOINT_FILTER_KEYS = ["attention", ...FINDING_KINDS] as const
export const NODE_CATEGORIES = ["guard", "logic", "data", "type", "ui", "config"] as const
export const BLAST_VERDICTS = ["changed", "breaks", "behaviour-changes", "unaffected", "unassessed"] as const
export const REVIEWER_STATES = ["pending", "commented", "approved", "changes-requested"] as const
export const SECTION_KINDS = ["context", "journey", "blast", "walkthrough", "conversation"] as const

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

const inlinesSchema = z.array(inlineSchema)

export const proseSchema = z.array(
  z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("paragraph"), inlines: inlinesSchema }),
    z.strictObject({ kind: z.literal("list"), isOrdered: z.boolean(), items: z.array(inlinesSchema) }),
  ]),
)

const linkSchema = z.strictObject({ href: z.string(), label: z.string() })

export const codeLinkSchema = z.strictObject({
  pathLabel: z.string(),
  rangeLabel: z.string(),
  lines: z.array(codeLineSchema),
  anchorId: z.string().nullable(),
  forgeLink: linkSchema.nullable(),
})

const personSchema = z.strictObject({
  name: z.string(),
  avatarUrl: z.string().nullable(),
  monogram: z.string(),
})

export const artifactFreshnessSchema = z.strictObject({
  label: z.string(),
  isOutOfDate: z.boolean(),
})

export const reviewHeaderSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("pull-request"),
    title: z.string(),
    author: personSchema,
    status: z.enum(BRANCH_STATUSES),
    statusLabel: z.string(),
    artifactFreshness: artifactFreshnessSchema.nullable(),
    reviewers: z.array(
      z.strictObject({
        name: z.string(),
        avatarUrl: z.string().nullable(),
        monogram: z.string(),
        state: z.enum(REVIEWER_STATES),
        stateLabel: z.string(),
      }),
    ),
    reviewersEmptyLabel: z.string().nullable(),
    forgeLink: linkSchema.nullable(),
  }),
  z.strictObject({
    kind: z.literal("branch"),
    branch: z.string(),
    forgeMessage: z.string(),
    artifactFreshness: artifactFreshnessSchema.nullable(),
    action: linkSchema,
  }),
])

const shellSchema = z.strictObject({
  documentTitle: z.string(),
  lineColor: z.enum(LINE_COLORS),
  header: reviewHeaderSchema,
  notice: z.string().nullable(),
})

export const staleNoticeSchema = z.strictObject({
  message: inlinesSchema,
  promptLabel: z.string(),
  prompt: z.string(),
  copiedMessage: z.string(),
})

export const draftingNoticeSchema = z.strictObject({ label: z.string(), message: z.string() })

const railSectionSchema = z.strictObject({
  anchorId: z.string(),
  kind: z.enum(SECTION_KINDS),
  label: z.string(),
  children: z.array(z.strictObject({ anchorId: z.string(), label: z.string() })),
})

export const railSchema = z.strictObject({
  groups: z.array(
    z.strictObject({
      anchorId: z.string(),
      label: z.string().nullable(),
      detailLabel: z.string().nullable(),
      sections: z.array(railSectionSchema),
    }),
  ),
  sections: z.array(railSectionSchema),
})

export const contextBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  context: proseSchema,
  overviewHeading: z.string(),
  whenLabel: z.string(),
  thenLabel: z.string(),
  scenarios: z.array(z.strictObject({ when: proseSchema, then: proseSchema })),
  implementationHeading: z.string(),
  groups: z.array(z.strictObject({ label: z.string(), items: z.array(proseSchema) })),
})

const pointSchema = z.strictObject({ x: z.number(), y: z.number() })

const boxShape = { x: z.number(), y: z.number(), width: z.number(), height: z.number() }

const edgeLabelSchema = z.strictObject({ text: z.string(), x: z.number(), y: z.number() })

export const journeyNodeSchema = z.strictObject({
  id: z.string(),
  ...boxShape,
  kind: z.enum(["entry-point", "head", "tail"]),
  category: z.enum(NODE_CATEGORIES).nullable(),
  kindLabel: z.string(),
  changedLabel: z.string().nullable(),
  label: z.string(),
  isDraft: z.boolean(),
  sublabel: z.string().nullable(),
  description: proseSchema.nullable(),
  codeLinkId: z.string().nullable(),
})

export const journeyEdgeSchema = z.strictObject({
  id: z.string(),
  kind: z.enum(["trigger", "call", "value", "data"]),
  isAssumed: z.boolean(),
  points: z.array(pointSchema),
  label: edgeLabelSchema.nullable(),
})

const optionGroupSchema = z.strictObject({
  label: z.string(),
  options: z.array(z.strictObject({ label: z.string(), value: z.number().nullable(), isSelected: z.boolean() })),
})

const toggleSchema = z.strictObject({
  key: z.enum(["data", "assumed"]),
  label: z.string(),
  countLabel: z.string(),
  isOn: z.boolean(),
})

export const diagramConfigurationSchema = z.strictObject({
  label: z.string(),
  levels: optionGroupSchema.nullable(),
  toggles: z.array(toggleSchema),
})

export const edgeLegendSchema = z.array(
  z.strictObject({ kind: z.enum(["call", "value", "data", "assumed"]), label: z.string() }),
)

export const journeyBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  absence: proseSchema.nullable(),
  configuration: diagramConfigurationSchema.nullable(),
  legend: edgeLegendSchema,
  diagram: z
    .strictObject({
      anchorId: z.string(),
      title: z.string(),
      summaryLabel: z.string(),
      width: z.number(),
      height: z.number(),
      nodes: z.array(journeyNodeSchema),
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
  configuration: diagramConfigurationSchema.nullable(),
  legend: edgeLegendSchema,
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

export const REVIEW_VERDICTS = ["comment", "approve", "request-changes"] as const
export const PUBLICATION_KINDS = ["description", "claude"] as const

export const commentSchema = z.strictObject({
  id: z.string(),
  author: personSchema,
  body: proseSchema,
  timeLabel: z.string(),
  pendingLabel: z.string().nullable(),
})

export const threadSchema = z.strictObject({
  id: z.string(),
  lineLabel: z.string(),
  comments: z.array(commentSchema),
})

export const composerLabelsSchema = z.strictObject({
  addLabel: z.string(),
  placeholder: z.string(),
  replyPlaceholder: z.string(),
  submitLabel: z.string(),
  cancelLabel: z.string(),
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
  threads: z.array(threadSchema),
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

export const segmentViewSchema = z.strictObject({
  id: z.string(),
  anchorId: z.string(),
  title: z.string().nullable(),
  heading: z.string().nullable(),
  detailLabel: z.string().nullable(),
  context: contextBandSchema,
  journey: journeyBandSchema,
  blast: blastBandSchema.nullable(),
  walkthrough: walkthroughBandSchema,
})

export const conversationBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  threadId: z.string().nullable(),
  emptyMessage: z.string().nullable(),
  entries: z.array(
    z.strictObject({
      id: z.string(),
      author: personSchema,
      verdict: z.enum(REVIEW_VERDICTS).nullable(),
      verdictLabel: z.string().nullable(),
      body: proseSchema,
      timeLabel: z.string(),
      pendingLabel: z.string().nullable(),
    }),
  ),
})

export const reviewDraftSchema = z.strictObject({
  isAvailable: z.boolean(),
  unavailableReason: z.string().nullable(),
  buttonLabel: z.string(),
  heading: z.string(),
  pendingLabel: z.string(),
  bodyPlaceholder: z.string(),
  submitLabel: z.string(),
  verdicts: z.array(z.strictObject({ key: z.enum(REVIEW_VERDICTS), label: z.string(), description: z.string() })),
})

export const sharingSchema = z.strictObject({
  buttonLabel: z.string(),
  options: z.array(
    z.strictObject({
      key: z.enum(PUBLICATION_KINDS),
      label: z.string(),
      description: z.string(),
      actionLabel: z.string(),
      isAvailable: z.boolean(),
      statusLabel: z.string().nullable(),
      link: linkSchema.nullable(),
    }),
  ),
})

const startFormSchema = z.strictObject({
  configuration: z.strictObject({
    heading: z.string(),
    hint: z.string(),
    dialogTitle: z.string(),
    dialogDescription: z.string(),
    chooseLabel: z.string(),
    cancelLabel: z.string(),
    selectedPreset: z.enum(PRESET_NAMES),
    options: z.array(
      z.strictObject({
        preset: z.enum(PRESET_NAMES),
        label: z.string(),
        tagLabel: z.string().nullable(),
        bestFor: z.string(),
        description: z.string(),
        note: z.string().nullable(),
      }),
    ),
  }),
  order: z.strictObject({
    heading: z.string(),
    hint: z.string(),
    dialogTitle: z.string(),
    dialogDescription: z.string(),
    chooseLabel: z.string(),
    cancelLabel: z.string(),
    selectedOrder: z.enum(WALKTHROUGH_ORDERS),
    options: z.array(
      z.strictObject({
        order: z.enum(WALKTHROUGH_ORDERS),
        label: z.string(),
        tagLabel: z.string().nullable(),
        summary: z.string(),
        description: z.string(),
        promptField: z.strictObject({ label: z.string(), placeholder: z.string() }).nullable(),
      }),
    ),
  }),
  writer: z.strictObject({
    heading: z.string(),
    hint: z.string(),
    selectedKey: z.enum([...AGENT_NAMES, MANUAL_WRITER]),
    agents: z.array(
      z.strictObject({
        agent: z.enum(AGENT_NAMES),
        label: z.string(),
        description: z.string(),
        unavailableReason: z.string().nullable(),
        modelLegend: z.string(),
        effortLegend: z.string(),
        hasModelChoice: z.boolean(),
        modelOptions: z.array(modelOptionSchema),
        selectedModel: z.string(),
        selectedEffort: z.string(),
        submitLabel: z.string(),
      }),
    ),
    manual: z.strictObject({ label: z.string(), description: z.string(), submitLabel: z.string() }),
  }),
  pendingLabel: z.string(),
})

export const reviewPageSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("missing"),
    shell: shellSchema,
    heading: z.string(),
    message: z.string(),
    changedFiles: z.array(labelSegmentSchema),
    form: startFormSchema,
  }),
  z.strictObject({
    kind: z.literal("artifact"),
    shell: shellSchema,
    staleNotice: staleNoticeSchema.nullable(),
    draftingNotice: draftingNoticeSchema.nullable(),
    rail: railSchema,
    segments: z.array(segmentViewSchema),
    walkthroughControls: walkthroughControlsSchema,
    conversation: conversationBandSchema.nullable(),
    composer: composerLabelsSchema.nullable(),
    reviewDraft: reviewDraftSchema,
    sharing: sharingSchema,
    chatLabel: z.string(),
    codeLinks: z.record(z.string(), codeLinkSchema),
  }),
])

const diagramRequestSchema = z.strictObject({
  levels: z.number().int().min(0).nullable(),
  isShowingData: z.boolean().nullable(),
  isShowingAssumed: z.boolean().nullable(),
})

export const getReviewInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  filterKeys: z.array(z.string()).nullable(),
  isShowingReviewed: z.boolean(),
  journey: diagramRequestSchema,
  blast: diagramRequestSchema,
})

export type StartForm = z.infer<typeof startFormSchema>
export type CodeLine = z.infer<typeof codeLineSchema>
export type Inline = z.infer<typeof inlineSchema>
export type Prose = z.infer<typeof proseSchema>
export type CodeLink = z.infer<typeof codeLinkSchema>
export type ArtifactFreshness = z.infer<typeof artifactFreshnessSchema>
export type ReviewHeader = z.infer<typeof reviewHeaderSchema>
export type ReviewShell = z.infer<typeof shellSchema>
export type StaleNotice = z.infer<typeof staleNoticeSchema>
export type DraftingNotice = z.infer<typeof draftingNoticeSchema>
export type Rail = z.infer<typeof railSchema>
export type ContextBand = z.infer<typeof contextBandSchema>
export type JourneyNodeView = z.infer<typeof journeyNodeSchema>
export type JourneyEdgeView = z.infer<typeof journeyEdgeSchema>
export type DiagramConfiguration = z.infer<typeof diagramConfigurationSchema>
export type EdgeLegend = z.infer<typeof edgeLegendSchema>
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
export type SegmentView = z.infer<typeof segmentViewSchema>
export type WalkthroughBand = z.infer<typeof walkthroughBandSchema>
export type ThreadView = z.infer<typeof threadSchema>
export type ConversationBand = z.infer<typeof conversationBandSchema>
export type ReviewDraft = z.infer<typeof reviewDraftSchema>
export type Sharing = z.infer<typeof sharingSchema>
export type ReviewPage = z.infer<typeof reviewPageSchema>
export type DiagramRequest = z.infer<typeof diagramRequestSchema>
export type GetReviewInput = z.infer<typeof getReviewInputSchema>
