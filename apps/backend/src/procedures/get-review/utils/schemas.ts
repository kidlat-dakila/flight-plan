import { z } from "zod"
import { ARRANGED_SECTIONS } from "@/procedures/get-review-preferences/utils/review-preferences"
import { BRANCH_STATUSES } from "@/procedures/list-repositories/utils/branch-status"
import { LINE_COLORS } from "@/procedures/list-repositories/utils/line-color"
import { labelSegmentSchema } from "@/procedures/list-repositories/utils/schemas"
import { targetOptionSchema } from "@/procedures/search-creation-targets/utils/schemas"
import {
  DIFF_TYPES,
  changeOverviewSchema,
  blastBandSchema,
  codeDefinitionSchema,
  codeLinkSchema,
  fileSectionSchema,
  inlinesSchema,
  traceBandSchema,
  linkSchema,
  proseSchema,
  walkthroughBandSchema,
} from "@flightplan/configurations"
import { FILE_ICONS } from "./file-icon"

export const REVIEWER_STATES = ["pending", "commented", "approved", "changes-requested"] as const
export const SECTION_KINDS = ["context", "traceDiagram", "blastDiagram", "walkthrough", "conversation"] as const

const personSchema = z.strictObject({
  name: z.string(),
  avatarUrl: z.string().nullable(),
  monogram: z.string(),
})

export const artifactFreshnessSchema = z.strictObject({
  label: z.string(),
  isOutOfDate: z.boolean(),
})

export const reviewerRequestSchema = z.strictObject({
  buttonLabel: z.string(),
  heading: z.string(),
  searchPlaceholder: z.string(),
  emptyLabel: z.string(),
  requestLabel: z.string(),
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
        request: z.strictObject({ login: z.string(), label: z.string(), isRemoving: z.boolean() }).nullable(),
      }),
    ),
    reviewersEmptyLabel: z.string().nullable(),
    reviewerRequest: reviewerRequestSchema.nullable(),
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
  authorLabel: z.string().nullable(),
  notice: z.string().nullable(),
})

export const staleNoticeSchema = z.strictObject({
  message: inlinesSchema,
  promptLabel: z.string(),
  prompt: z.string(),
  copiedMessage: z.string(),
})

export const PROGRESS_STATES = ["writing", "waiting"] as const

export const reviewProgressSchema = z.strictObject({
  state: z.enum(PROGRESS_STATES),
  label: z.string(),
  message: z.string(),
  isWriting: z.boolean(),
  countLabel: z.string(),
  writtenCount: z.number().int(),
  totalCount: z.number().int(),
  prompt: z.strictObject({ label: z.string(), text: z.string(), copiedMessage: z.string() }).nullable(),
})

export const completionNoticeSchema = z.strictObject({ title: z.string(), body: z.string() })

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

export const FILE_MARK_KINDS = ["bug", "risk", "core-change", "question", "nit"] as const

const explorerPlaceSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  depth: z.number().int(),
  ancestorIds: z.array(z.string()),
})

export const fileExplorerRowSchema = z.discriminatedUnion("kind", [
  explorerPlaceSchema.extend({ kind: z.literal("folder") }),
  explorerPlaceSchema.extend({
    kind: z.literal("file"),
    icon: z.strictObject({ kind: z.enum(FILE_ICONS), label: z.string() }),
    change: z.strictObject({ kind: z.enum(DIFF_TYPES), label: z.string() }).nullable(),
    anchorId: z.string().nullable(),
    noteLabel: z.string().nullable(),
    marks: z.array(z.strictObject({ kind: z.enum(FILE_MARK_KINDS), label: z.string() })),
    reviewed: z.strictObject({ count: z.number().int(), total: z.number().int(), label: z.string() }).nullable(),
    match: z.strictObject({ count: z.number().int(), label: z.string() }).nullable(),
  }),
])

export const fileExplorerSchema = z.strictObject({
  summary: z.array(z.string()),
  filter: z.strictObject({ label: z.string(), values: z.array(z.string()), clearLabel: z.string() }).nullable(),
  hiddenLabel: z.string().nullable(),
  rows: z.array(fileExplorerRowSchema),
})

const panelLabelsSchema = z.strictObject({ label: z.string(), hideLabel: z.string(), showLabel: z.string() })

export const reviewPanelsSchema = z.strictObject({
  explorer: panelLabelsSchema,
  sections: panelLabelsSchema,
  chat: panelLabelsSchema,
})

export const contextBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  context: proseSchema,
  markdown: z.string(),
  isDraft: z.boolean(),
  unwrittenLabel: z.string(),
  changeOverview: changeOverviewSchema,
})

export const REVIEW_VERDICTS = ["comment", "approve", "request-changes"] as const
export const PUBLICATION_KINDS = ["description", "claude"] as const

export const DIFF_SIDES = ["old", "new"] as const

export const commentSchema = z.strictObject({
  id: z.string(),
  author: personSchema,
  body: proseSchema,
  timeLabel: z.string(),
  pendingLabel: z.string().nullable(),
  discardLabel: z.string().nullable(),
})

export const THREAD_MARK_KINDS = ["open", "pending", "resolved"] as const

export const threadSchema = z.strictObject({
  id: z.string(),
  side: z.enum(DIFF_SIDES),
  lineLabel: z.string(),
  startLineLabel: z.string(),
  rangeLabel: z.string().nullable(),
  linesLabel: z.string(),
  mark: z.strictObject({ kind: z.enum(THREAD_MARK_KINDS), label: z.string() }),
  startsOpen: z.boolean(),
  statusLabel: z.string().nullable(),
  resolution: z.strictObject({ label: z.string(), isResolving: z.boolean() }).nullable(),
  canReply: z.boolean(),
  comments: z.array(commentSchema),
})

export const composerLabelsSchema = z.strictObject({
  addLabel: z.string(),
  placeholder: z.string(),
  replyPlaceholder: z.string(),
  submitLabel: z.string(),
  postNowLabel: z.string(),
  replyLabel: z.string(),
  commentLabel: z.string(),
  cancelLabel: z.string(),
  rangeHint: z.string(),
})

export const discussedFileSectionSchema = fileSectionSchema.extend({ threads: z.array(threadSchema) })

export const discussedWalkthroughBandSchema = walkthroughBandSchema.extend({ files: z.array(discussedFileSectionSchema) })

export const segmentOutlineSchema = z.strictObject({
  heading: z.string(),
  detailLabel: z.string(),
  label: z.string(),
  paths: z.array(z.string()),
  canMoveUp: z.boolean(),
  canMoveDown: z.boolean(),
})

export const unassignedFilesSchema = z.strictObject({
  label: z.string(),
  message: z.string(),
  actionLabel: z.string(),
  title: z.string(),
  description: z.string(),
  publishWarning: z.string(),
  paths: z.array(z.string()),
})

export const segmentViewSchema = z.strictObject({
  id: z.string(),
  anchorId: z.string(),
  title: z.string().nullable(),
  heading: z.string().nullable(),
  isTitleDraft: z.boolean(),
  detailLabel: z.string().nullable(),
  outline: segmentOutlineSchema,
  context: contextBandSchema,
  traceDiagram: traceBandSchema,
  blastDiagram: blastBandSchema.nullable(),
  walkthrough: discussedWalkthroughBandSchema,
  sectionOrder: z.array(z.enum(ARRANGED_SECTIONS)),
  writeUpNotices: z.strictObject({
    context: z.string().nullable(),
    traceDiagram: z.string().nullable(),
    blastDiagram: z.string().nullable(),
    walkthrough: z.string().nullable(),
  }),
})

export const conversationBandSchema = z.strictObject({
  anchorId: z.string(),
  heading: z.string(),
  emptyMessage: z.string().nullable(),
  entries: z.array(
    commentSchema.extend({
      verdict: z.enum(REVIEW_VERDICTS).nullable(),
      verdictLabel: z.string().nullable(),
      locationLabel: z.string().nullable(),
    }),
  ),
})

export const reviewDraftSchema = z.strictObject({
  isAvailable: z.boolean(),
  unavailableReason: z.string().nullable(),
  buttonLabel: z.string(),
  heading: z.string(),
  pendingLabel: z.string(),
  pendingComments: z.array(
    z.strictObject({
      id: z.string(),
      locationLabel: z.string(),
      excerpt: z.string(),
      staleLabel: z.string().nullable(),
      discardLabel: z.string(),
    }),
  ),
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
      pendingLabel: z.string(),
      isPending: z.boolean(),
      isAvailable: z.boolean(),
      statusLabel: z.string().nullable(),
      link: linkSchema.nullable(),
    }),
  ),
})

export const pullRequestChoiceSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  emptyMessage: z.string().nullable(),
  options: z.array(targetOptionSchema),
  selectedId: z.string().nullable(),
  confirmLabel: z.string(),
  skipLabel: z.string(),
  cancelLabel: z.string(),
})

export const completeActionSchema = z.strictObject({
  label: z.string(),
  pullRequestChoice: pullRequestChoiceSchema.nullable(),
})

export const reviewPageSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("missing"),
    shell: shellSchema,
    isOwn: z.boolean(),
    heading: z.string(),
    message: z.string(),
    changedFiles: z.array(labelSegmentSchema),
  }),
  z.strictObject({
    kind: z.literal("artifact"),
    shell: shellSchema,
    isOwn: z.boolean(),
    canMoveCards: z.boolean(),
    completeAction: completeActionSchema.nullable(),
    staleNotice: staleNoticeSchema.nullable(),
    progress: reviewProgressSchema.nullable(),
    completion: completionNoticeSchema.nullable(),
    unassignedFiles: unassignedFilesSchema.nullable(),
    rail: railSchema,
    segments: z.array(segmentViewSchema),
    conversation: conversationBandSchema.nullable(),
    composer: composerLabelsSchema.nullable(),
    reviewDraft: reviewDraftSchema.nullable(),
    sharing: sharingSchema.nullable(),
    panels: reviewPanelsSchema,
    fileExplorer: fileExplorerSchema,
    codeLinks: z.record(z.string(), codeLinkSchema),
    codeDefinitions: z.record(z.string(), codeDefinitionSchema),
  }),
])

export const getReviewInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  filterKeys: z.array(z.string()),
  isShowingReviewed: z.boolean(),
})

export type ArtifactFreshness = z.infer<typeof artifactFreshnessSchema>
export type ReviewHeader = z.infer<typeof reviewHeaderSchema>
export type ReviewShell = z.infer<typeof shellSchema>
export type StaleNotice = z.infer<typeof staleNoticeSchema>
export type ReviewProgress = z.infer<typeof reviewProgressSchema>
export type CompletionNotice = z.infer<typeof completionNoticeSchema>
export type Rail = z.infer<typeof railSchema>
export type FileExplorer = z.infer<typeof fileExplorerSchema>
export type FileExplorerRow = z.infer<typeof fileExplorerRowSchema>
export type ReviewPanels = z.infer<typeof reviewPanelsSchema>
export type ContextBand = z.infer<typeof contextBandSchema>
export type SegmentOutline = z.infer<typeof segmentOutlineSchema>
export type UnassignedFiles = z.infer<typeof unassignedFilesSchema>
export type SegmentView = z.infer<typeof segmentViewSchema>
export type DiscussedFileSection = z.infer<typeof discussedFileSectionSchema>
export type DiscussedWalkthroughBand = z.infer<typeof discussedWalkthroughBandSchema>
export type ThreadView = z.infer<typeof threadSchema>
export type ComposerLabels = z.infer<typeof composerLabelsSchema>
export type ReviewerRequest = z.infer<typeof reviewerRequestSchema>
export type ConversationBand = z.infer<typeof conversationBandSchema>
export type ReviewDraft = z.infer<typeof reviewDraftSchema>
export type CompleteAction = z.infer<typeof completeActionSchema>
export type Sharing = z.infer<typeof sharingSchema>
export type ReviewPage = z.infer<typeof reviewPageSchema>
export type GetReviewInput = z.infer<typeof getReviewInputSchema>
